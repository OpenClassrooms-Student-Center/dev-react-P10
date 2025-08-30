import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  CreateCommentRequest,
  UpdateCommentRequest,
  AuthRequest,
} from "../types";
import {
  validateCreateCommentData,
  validateUpdateCommentData,
} from "../utils/validation";
import { hasProjectAccess, canModifyTasks } from "../utils/permissions";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from "../utils/response";

const prisma = new PrismaClient();

/**
 * Créer un nouveau commentaire sur une tâche
 * POST /projects/:projectId/tasks/:taskId/comments
 */
export const createComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { taskId } = req.params;
    console.log("Paramètres reçus dans createComment:", req.params);
    console.log("projectId:", projectId, "taskId:", taskId);
    const { content }: CreateCommentRequest = req.body;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendError(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
      return;
    }

    // Validation des données
    const validationErrors = validateCreateCommentData({ content });
    if (validationErrors.length > 0) {
      sendValidationError(
        res,
        "Données de création de commentaire invalides",
        validationErrors
      );
      return;
    }

    // Vérifier l'accès au projet
    const hasAccess = await hasProjectAccess(authReq.user.id, projectId);
    if (!hasAccess) {
      sendError(res, "Accès refusé au projet", "FORBIDDEN", 403);
      return;
    }

    // Vérifier que la tâche existe et appartient au projet
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      sendError(res, "Tâche non trouvée", "TASK_NOT_FOUND", 404);
      return;
    }

    // Créer le commentaire
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId,
        authorId: authReq.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    sendSuccess(res, "Commentaire créé avec succès", { comment }, 201);
  } catch (error) {
    console.error("Erreur lors de la création du commentaire:", error);
    sendServerError(res, "Erreur lors de la création du commentaire");
  }
};

/**
 * Récupérer tous les commentaires d'une tâche
 * GET /projects/:projectId/tasks/:taskId/comments
 */
export const getComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { taskId } = req.params;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendError(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
      return;
    }

    // Vérifier l'accès au projet
    const hasAccess = await hasProjectAccess(authReq.user.id, projectId);
    if (!hasAccess) {
      sendError(res, "Accès refusé au projet", "FORBIDDEN", 403);
      return;
    }

    // Vérifier que la tâche existe et appartient au projet
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      sendError(res, "Tâche non trouvée", "TASK_NOT_FOUND", 404);
      return;
    }

    // Récupérer les commentaires
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    sendSuccess(res, "Commentaires récupérés avec succès", { comments });
  } catch (error) {
    console.error("Erreur lors de la récupération des commentaires:", error);
    sendServerError(res, "Erreur lors de la récupération des commentaires");
  }
};

/**
 * Récupérer un commentaire spécifique
 * GET /projects/:projectId/tasks/:taskId/comments/:commentId
 */
export const getComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { taskId, commentId } = req.params;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendError(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
      return;
    }

    // Vérifier l'accès au projet
    const hasAccess = await hasProjectAccess(authReq.user.id, projectId);
    if (!hasAccess) {
      sendError(res, "Accès refusé au projet", "FORBIDDEN", 403);
      return;
    }

    // Récupérer le commentaire
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          projectId,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!comment) {
      sendError(res, "Commentaire non trouvé", "COMMENT_NOT_FOUND", 404);
      return;
    }

    sendSuccess(res, "Commentaire récupéré avec succès", { comment });
  } catch (error) {
    console.error("Erreur lors de la récupération du commentaire:", error);
    sendServerError(res, "Erreur lors de la récupération du commentaire");
  }
};

/**
 * Mettre à jour un commentaire
 * PUT /projects/:projectId/tasks/:taskId/comments/:commentId
 */
export const updateComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { taskId, commentId } = req.params;
    const { content }: UpdateCommentRequest = req.body;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendError(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
      return;
    }

    // Validation des données
    const validationErrors = validateUpdateCommentData({ content });
    if (validationErrors.length > 0) {
      sendValidationError(
        res,
        "Données de mise à jour invalides",
        validationErrors
      );
      return;
    }

    // Vérifier l'accès au projet
    const hasAccess = await hasProjectAccess(authReq.user.id, projectId);
    if (!hasAccess) {
      sendError(res, "Accès refusé au projet", "FORBIDDEN", 403);
      return;
    }

    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          projectId,
        },
      },
    });

    if (!existingComment) {
      sendError(res, "Commentaire non trouvé", "COMMENT_NOT_FOUND", 404);
      return;
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire
    if (existingComment.authorId !== authReq.user.id) {
      sendError(
        res,
        "Vous ne pouvez modifier que vos propres commentaires",
        "FORBIDDEN",
        403
      );
      return;
    }

    // Mettre à jour le commentaire
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    sendSuccess(res, "Commentaire mis à jour avec succès", {
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du commentaire:", error);
    sendServerError(res, "Erreur lors de la mise à jour du commentaire");
  }
};

/**
 * Supprimer un commentaire
 * DELETE /projects/:projectId/tasks/:taskId/comments/:commentId
 */
export const deleteComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { taskId, commentId } = req.params;
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      sendError(res, "Utilisateur non authentifié", "UNAUTHORIZED", 401);
      return;
    }

    // Vérifier l'accès au projet
    const hasAccess = await hasProjectAccess(authReq.user.id, projectId);
    if (!hasAccess) {
      sendError(res, "Accès refusé au projet", "FORBIDDEN", 403);
      return;
    }

    // Vérifier que le commentaire existe
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          projectId,
        },
      },
    });

    if (!existingComment) {
      sendError(res, "Commentaire non trouvé", "COMMENT_NOT_FOUND", 404);
      return;
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire ou a les permissions de modération
    const canModify = await canModifyTasks(authReq.user.id, projectId);
    if (existingComment.authorId !== authReq.user.id && !canModify) {
      sendError(
        res,
        "Vous ne pouvez supprimer que vos propres commentaires",
        "FORBIDDEN",
        403
      );
      return;
    }

    // Supprimer le commentaire
    await prisma.comment.delete({
      where: { id: commentId },
    });

    sendSuccess(res, "Commentaire supprimé avec succès");
  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire:", error);
    sendServerError(res, "Erreur lors de la suppression du commentaire");
  }
};
