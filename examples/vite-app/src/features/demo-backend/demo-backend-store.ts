import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { demoProjects, demoTasks, demoUsers } from "./demo-seed";
import type { Project, Task, User } from "@/types";

export interface UserListParams {
  q?: string;
  status?: string;
}

export interface ProjectListParams {
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
}

export interface TaskListParams {
  q?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  assigneeId?: string;
  sort?: string;
}

interface DemoBackendState {
  users: User[];
  projects: Project[];
  tasks: Task[];
  reset: () => void;
  listUsers: (params?: UserListParams) => User[];
  getUser: (id: string) => User | undefined;
  createUser: (data: Partial<User>) => User;
  updateUser: (id: string, patch: Partial<User>) => User;
  deleteUser: (id: string) => void;
  listProjects: (params?: ProjectListParams) => Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (data: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => Project;
  deleteProject: (id: string) => void;
  listTasks: (params?: TaskListParams) => Task[];
  getTask: (id: string) => Task | undefined;
  createTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, patch: Partial<Task>) => Task;
  deleteTask: (id: string) => void;
}

const cloneUser = (user: User): User => ({ ...user });
const cloneProject = (project: Project): Project => ({
  ...project,
  memberIds: [...project.memberIds],
  tags: [...project.tags],
});
const cloneTask = (task: Task): Task => ({
  ...task,
  tags: [...task.tags],
});

const cloneUsers = (users: User[]) => users.map(cloneUser);
const cloneProjects = (projects: Project[]) => projects.map(cloneProject);
const cloneTasks = (tasks: Task[]) => tasks.map(cloneTask);

const compareValues = (left: unknown, right: unknown) =>
  String(left ?? "").localeCompare(String(right ?? ""));

function sortByParam<T extends Record<string, unknown>>(items: T[], sort?: string) {
  if (!sort) return items;
  const [field, dir] = sort.startsWith("-")
    ? [sort.slice(1), "desc"]
    : [sort, "asc"];
  return [...items].sort((a, b) => {
    const comparison = compareValues(a[field], b[field]);
    return dir === "desc" ? -comparison : comparison;
  });
}

const initialState = () => ({
  users: cloneUsers(demoUsers),
  projects: cloneProjects(demoProjects),
  tasks: cloneTasks(demoTasks),
});

export const delay = (ms = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 100));

export const useDemoBackendStore = create<DemoBackendState>((set, get) => ({
  ...initialState(),
  reset: () => set(initialState()),
  listUsers: (params) => {
    let items = cloneUsers(get().users);
    if (params?.q) {
      const query = params.q.toLowerCase();
      items = items.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }
    if (params?.status) {
      items = items.filter((user) => user.status === params.status);
    }
    return items;
  },
  getUser: (id) => {
    const user = get().users.find((entry) => entry.id === id);
    return user ? cloneUser(user) : undefined;
  },
  createUser: (data) => {
    const newUser: User = {
      id: generateId(),
      name: data.name ?? "",
      email: data.email ?? "",
      role: data.role ?? "developer",
      avatarInitials: (data.name ?? "?")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      avatarColor: data.avatarColor ?? "#f97316",
      department: data.department ?? "Engineering",
      joinedAt: new Date().toISOString().split("T")[0] ?? "",
      status: data.status ?? "active",
      ...data,
    };
    set((state) => ({ users: [...state.users, newUser] }));
    return cloneUser(newUser);
  },
  updateUser: (id, patch) => {
    const index = get().users.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error(`User ${id} not found`);
    }
    const nextUser = { ...get().users[index], ...patch };
    set((state) => ({
      users: state.users.map((entry) => (entry.id === id ? nextUser : entry)),
    }));
    return cloneUser(nextUser);
  },
  deleteUser: (id) => {
    set((state) => ({
      users: state.users.filter((entry) => entry.id !== id),
    }));
  },
  listProjects: (params) => {
    let items = cloneProjects(get().projects);
    if (params?.q) {
      const query = params.q.toLowerCase();
      items = items.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query),
      );
    }
    if (params?.status) {
      items = items.filter((project) => project.status === params.status);
    }
    if (params?.priority) {
      items = items.filter((project) => project.priority === params.priority);
    }
    return sortByParam(items, params?.sort).map(cloneProject);
  },
  getProject: (id) => {
    const project = get().projects.find((entry) => entry.id === id);
    return project ? cloneProject(project) : undefined;
  },
  createProject: (data) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: generateId(),
      name: data.name ?? "Untitled Project",
      description: data.description ?? "",
      status: data.status ?? "planning",
      priority: data.priority ?? "medium",
      ownerId: data.ownerId ?? "u1",
      memberIds: data.memberIds ?? [],
      budget: data.budget ?? 0,
      spent: data.spent ?? 0,
      startDate: data.startDate ?? (now.split("T")[0] ?? ""),
      dueDate: data.dueDate ?? "",
      createdAt: now,
      updatedAt: now,
      progress: data.progress ?? 0,
      tags: data.tags ?? [],
      ...data,
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    return cloneProject(newProject);
  },
  updateProject: (id, patch) => {
    const index = get().projects.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error(`Project ${id} not found`);
    }
    const nextProject: Project = {
      ...get().projects[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: state.projects.map((entry) =>
        entry.id === id ? nextProject : entry,
      ),
    }));
    return cloneProject(nextProject);
  },
  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((entry) => entry.id !== id),
      tasks: state.tasks.filter((task) => task.projectId !== id),
    }));
  },
  listTasks: (params) => {
    let items = cloneTasks(get().tasks);
    if (params?.q) {
      const query = params.q.toLowerCase();
      items = items.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query),
      );
    }
    if (params?.status) {
      items = items.filter((task) => task.status === params.status);
    }
    if (params?.priority) {
      items = items.filter((task) => task.priority === params.priority);
    }
    if (params?.projectId) {
      items = items.filter((task) => task.projectId === params.projectId);
    }
    if (params?.assigneeId) {
      items = items.filter((task) => task.assigneeId === params.assigneeId);
    }
    if (params?.sort) {
      return sortByParam(items, params.sort).map(cloneTask);
    }
    return [...items]
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .map(cloneTask);
  },
  getTask: (id) => {
    const task = get().tasks.find((entry) => entry.id === id);
    return task ? cloneTask(task) : undefined;
  },
  createTask: (data) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateId(),
      title: data.title ?? "Untitled Task",
      description: data.description ?? "",
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
      projectId: data.projectId ?? "p1",
      assigneeId: data.assigneeId ?? null,
      reporterId: data.reporterId ?? "u1",
      estimatedHours: data.estimatedHours ?? null,
      loggedHours: data.loggedHours ?? 0,
      dueDate: data.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
      tags: data.tags ?? [],
      storyPoints: data.storyPoints ?? null,
      ...data,
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    return cloneTask(newTask);
  },
  updateTask: (id, patch) => {
    const index = get().tasks.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error(`Task ${id} not found`);
    }
    const nextTask: Task = {
      ...get().tasks[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      tasks: state.tasks.map((entry) => (entry.id === id ? nextTask : entry)),
    }));
    return cloneTask(nextTask);
  },
  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((entry) => entry.id !== id),
    }));
  },
}));
