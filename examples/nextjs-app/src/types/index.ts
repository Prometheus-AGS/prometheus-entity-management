export interface User {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  role: "admin" | "lead" | "developer" | "designer" | "analyst";
  avatarInitials: string;
  avatarColor: string;
  department: string;
  joinedAt: string;
  status: "active" | "away" | "offline";
}

export interface Project {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "on-hold" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "critical";
  ownerId: string;
  memberIds: string[];
  budget: number;
  spent: number;
  startDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  tags: string[];
}

export interface Task {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in-progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  projectId: string;
  assigneeId: string | null;
  reporterId: string;
  estimatedHours: number | null;
  loggedHours: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  storyPoints: number | null;
}
