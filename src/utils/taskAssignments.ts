import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Vérifie si les utilisateurs sont membres du projet
 * @param projectId - ID du projet
 * @param userIds - IDs des utilisateurs à vérifier
 * @returns true si tous les utilisateurs sont membres, false sinon
 */
export const validateProjectMembers = async (
  projectId: string,
  userIds: string[]
): Promise<boolean> => {
  if (userIds.length === 0) return true;

  const projectMembers = await prisma.projectMember.findMany({
    where: {
      projectId,
      userId: { in: userIds },
    },
  });

  return projectMembers.length === userIds.length;
};

/**
 * Met à jour les assignations d'une tâche
 * @param taskId - ID de la tâche
 * @param assigneeIds - IDs des utilisateurs à assigner
 */
export const updateTaskAssignments = async (
  taskId: string,
  assigneeIds: string[]
): Promise<void> => {
  // Supprimer toutes les assignations existantes
  await prisma.taskAssignee.deleteMany({
    where: { taskId },
  });

  // Ajouter les nouvelles assignations
  if (assigneeIds.length > 0) {
    await prisma.taskAssignee.createMany({
      data: assigneeIds.map((userId) => ({
        taskId,
        userId,
      })),
    });
  }
};

/**
 * Récupère les assignations d'une tâche avec les détails des utilisateurs
 * @param taskId - ID de la tâche
 * @returns Les assignations avec les détails des utilisateurs
 */
export const getTaskAssignments = async (taskId: string) => {
  const assignees = await prisma.taskAssignee.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return assignees.map((assignee) => ({
    id: assignee.id,
    assignedAt: assignee.assignedAt,
    user: assignee.user,
  }));
};
