"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Archive,
  ArrowDownUp,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Mail,
  Filter,
  FolderKanban,
  Inbox,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Type,
  Users,
  X,
} from "lucide-react";

type Status = "backlog" | "progress" | "review" | "done";
type Priority = "High" | "Medium" | "Low";
type Project = string;
type Comment = { id: number; author: string; date: string; text: string };
type Assignee = { name: string; initials: string; color: string };

type Task = {
  id: number;
  team: string;
  project: Project;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due: string;
  labels: string[];
  assignee: string;
  initials: string;
  color: string;
  assignees: Assignee[];
  comments: Comment[];
};

const initialTaskSeeds: Omit<Task, "team" | "project" | "assignees" | "comments">[] = [
  { id: 1, title: "Map the onboarding journey", description: "Outline the first-time user path and identify friction points.", status: "backlog", priority: "High", due: "Jun 14", labels: ["Research", "Strategy"], assignee: "Mina Patel", initials: "MP", color: "coral" },
  { id: 2, title: "Audit empty states", description: "Review empty states across the core product surfaces.", status: "backlog", priority: "Medium", due: "Jun 18", labels: ["UX writing"], assignee: "Owen Brooks", initials: "OB", color: "mint" },
  { id: 3, title: "Create component inventory", description: "Document all current components and their usage rules.", status: "backlog", priority: "Low", due: "Jun 21", labels: ["Design system"], assignee: "Lena Park", initials: "LP", color: "lilac" },
  { id: 4, title: "Build settings navigation", description: "Give users a clear path between account and workspace settings.", status: "progress", priority: "High", due: "Today", labels: ["Product", "Web"], assignee: "Mina Patel", initials: "MP", color: "coral" },
  { id: 5, title: "Refine notification rules", description: "Decide what deserves an interruption and what can wait.", status: "progress", priority: "Medium", due: "Jun 15", labels: ["Product"], assignee: "Kai Reed", initials: "KR", color: "yellow" },
  { id: 6, title: "Prototype quick switcher", description: "Explore a keyboard-first way to move between projects.", status: "progress", priority: "Low", due: "Jun 19", labels: ["Prototype"], assignee: "Owen Brooks", initials: "OB", color: "mint" },
  { id: 7, title: "Review analytics events", description: "Check naming consistency before the next release.", status: "review", priority: "High", due: "Jun 13", labels: ["Analytics"], assignee: "Lena Park", initials: "LP", color: "lilac" },
  { id: 8, title: "QA account recovery", description: "Run through the edge cases for forgotten passwords.", status: "review", priority: "Medium", due: "Jun 17", labels: ["QA", "Web"], assignee: "Kai Reed", initials: "KR", color: "yellow" },
  { id: 9, title: "Publish v2.4 release notes", description: "Share the changes and small improvements with the team.", status: "done", priority: "Low", due: "Jun 10", labels: ["Launch"], assignee: "Mina Patel", initials: "MP", color: "coral" },
  { id: 10, title: "Update team permissions", description: "Align workspace roles with the new team structure.", status: "done", priority: "Medium", due: "Jun 11", labels: ["Admin"], assignee: "Owen Brooks", initials: "OB", color: "mint" },
];

const initialTasks: Task[] = initialTaskSeeds.map((task, index) => ({
  ...task,
  team: "Product team",
  project: index < 4 ? "Website refresh" : index < 7 ? "Mobile app" : "Brand sprint",
  assignees: index === 0 ? [{ name: "Mina Patel", initials: "MP", color: "coral" }, { name: "Owen Brooks", initials: "OB", color: "mint" }] : [{ name: task.assignee, initials: task.initials, color: task.color }],
  comments: index === 0 ? [{ id: 1, author: "Owen Brooks", date: "Jun 10", text: "I will share the latest research notes this afternoon." }] : [],
}));

const columns: { id: Status; name: string; accent: string }[] = [
  { id: "backlog", name: "Backlog", accent: "blue" },
  { id: "progress", name: "In progress", accent: "orange" },
  { id: "review", name: "In review", accent: "pink" },
  { id: "done", name: "Done", accent: "green" },
];

const priorityClass: Record<Priority, string> = { High: "high", Medium: "medium", Low: "low" };

const teamData = [
  {
    name: "Product team",
    projects: ["Website refresh", "Mobile app", "Brand sprint"],
    people: [
      { name: "Mina Patel", role: "Product lead", initials: "MP", color: "coral" },
      { name: "Owen Brooks", role: "Product designer", initials: "OB", color: "mint" },
      { name: "Lena Park", role: "Content strategist", initials: "LP", color: "lilac" },
      { name: "Kai Reed", role: "Engineer", initials: "KR", color: "yellow" },
    ],
    inboxItems: [
      { title: "Mina mentioned you in Website refresh", detail: "Can you take a look at the new settings flow?", time: "10 min ago", initials: "MP", color: "coral" },
      { title: "Owen completed Audit empty states", detail: "Website refresh / Backlog", time: "1 hr ago", initials: "OB", color: "mint" },
      { title: "You were added to Mobile app", detail: "Kai Reed added you as a collaborator", time: "Yesterday", initials: "KR", color: "yellow" },
    ],
    projectDetails: {
      "Website refresh": { color: "coral", eyebrow: "PRODUCT / Q2 2024", description: "Make the product feel as thoughtful as the people behind it." },
      "Mobile app": { color: "blue", eyebrow: "PRODUCT / Q2 2024", description: "Make the mobile experience faster, clearer, and more useful." },
      "Brand sprint": { color: "yellow", eyebrow: "MARKETING / Q2 2024", description: "Give Northstar a visual language that feels unmistakably its own." },
    },
  },
] as const;

type Person = { name: string; role: string; initials: string; color: string };
type Team = { name: string; projects: readonly string[]; people: readonly Person[]; inboxItems: readonly { title: string; detail: string; time: string; initials: string; color: string }[]; projectDetails: Readonly<Record<string, { color: string; eyebrow: string; description: string }>> };

type ThemeColors = { ink: string; muted: string; line: string; paper: string; sidebar: string; white: string; blue: string; orange: string; pink: string; green: string; accent: string; "accent-strong": string; "on-accent": string; "surface-muted": string };
type BoardTheme = { id: string; name: string; description: string; dark?: boolean; colors: ThemeColors };

const THEMES: BoardTheme[] = [
  { id: "northstar", name: "Northstar", description: "Clean and calm default", colors: { ink: "#202329", muted: "#747b83", line: "#e8e9e7", paper: "#fbfbf9", sidebar: "#f2f5f1", white: "#ffffff", blue: "#5d79ec", orange: "#ed9b5c", pink: "#df7c99", green: "#66af88", accent: "#e98163", "accent-strong": "#262e41", "on-accent": "#ffffff", "surface-muted": "#e4eae3" } },
  { id: "midnight", name: "Midnight", description: "Deep navy with warm light", dark: true, colors: { ink: "#edf0f7", muted: "#aab4c3", line: "#2c3445", paper: "#11151d", sidebar: "#182033", white: "#1d2635", blue: "#8ca2ff", orange: "#f4b978", pink: "#f09ab5", green: "#87d4a5", accent: "#f3a576", "accent-strong": "#202b50", "on-accent": "#ffffff", "surface-muted": "#26324a" } },
  { id: "ocean", name: "Ocean Breeze", description: "Fresh blues and teal", colors: { ink: "#152632", muted: "#5c7480", line: "#d7e6ea", paper: "#f3fafc", sidebar: "#e7f3f6", white: "#ffffff", blue: "#3aa0c9", orange: "#f0a860", pink: "#e28aa8", green: "#3fb8a0", accent: "#2f9fb0", "accent-strong": "#0f3a4a", "on-accent": "#ffffff", "surface-muted": "#d7ecef" } },
  { id: "sunset", name: "Sunset Warm", description: "Cozy coral and amber", colors: { ink: "#3a2418", muted: "#8a6a55", line: "#f0ded0", paper: "#fff8f2", sidebar: "#fbeee1", white: "#ffffff", blue: "#7189e0", orange: "#f2924f", pink: "#ea7c8f", green: "#7bab6f", accent: "#e8603f", "accent-strong": "#5c2a1c", "on-accent": "#ffffff", "surface-muted": "#f7e2d0" } },
  { id: "forest", name: "Forest Calm", description: "Grounded natural greens", colors: { ink: "#1c2b20", muted: "#5f7568", line: "#dbe8dd", paper: "#f5faf4", sidebar: "#e6f0e4", white: "#ffffff", blue: "#5d8fec", orange: "#e0a35c", pink: "#d989a3", green: "#3f9868", accent: "#2f8f5b", "accent-strong": "#1e3d2a", "on-accent": "#ffffff", "surface-muted": "#dceedd" } },
  { id: "grape", name: "Grape Dark", description: "Bold purple after dark", dark: true, colors: { ink: "#eae6f5", muted: "#a99fc2", line: "#332a4d", paper: "#161222", sidebar: "#1c1730", white: "#241d3a", blue: "#8c9cf0", orange: "#eeae7c", pink: "#e796b5", green: "#7fc9a4", accent: "#a680f2", "accent-strong": "#4b3a8a", "on-accent": "#ffffff", "surface-muted": "#2a2247" } },
  { id: "cobalt-citrus", name: "Cobalt Citrus", description: "Electric blue with bright citrus", colors: { ink: "#17233d", muted: "#66728a", line: "#dce4f2", paper: "#f7f9fe", sidebar: "#eaf0fa", white: "#ffffff", blue: "#3568e8", orange: "#ed9a3d", pink: "#e17591", green: "#46a984", accent: "#e6a929", "accent-strong": "#1f3f9f", "on-accent": "#ffffff", "surface-muted": "#e2eafa" } },
  { id: "rose-studio", name: "Rose Studio", description: "Modern rose with midnight ink", colors: { ink: "#2b2431", muted: "#7d6c77", line: "#eadde3", paper: "#fdf8fa", sidebar: "#f7eaef", white: "#ffffff", blue: "#667dd5", orange: "#e4a258", pink: "#d95f82", green: "#5fa77e", accent: "#cd5b78", "accent-strong": "#493047", "on-accent": "#ffffff", "surface-muted": "#f0dde5" } },
  { id: "aurora", name: "Aurora Night", description: "Deep teal with luminous accents", dark: true, colors: { ink: "#e4f0ed", muted: "#9bb5ae", line: "#28453f", paper: "#10221f", sidebar: "#172f2a", white: "#19342e", blue: "#65a8f1", orange: "#f2b76b", pink: "#ec85ad", green: "#68c49a", accent: "#46c5b0", "accent-strong": "#166c61", "on-accent": "#ffffff", "surface-muted": "#23463f" } },
];

type BoardFont = { id: string; name: string; description: string; body: string; heading: string };

const FONTS: BoardFont[] = [
  { id: "classic", name: "Classic", description: "DM Sans + Space Grotesk", body: "'DM Sans', sans-serif", heading: "'Space Grotesk', sans-serif" },
  { id: "modern", name: "Modern", description: "Inter + Poppins", body: "'Inter', sans-serif", heading: "'Poppins', sans-serif" },
  { id: "editorial", name: "Editorial", description: "Lora + Playfair Display", body: "'Lora', serif", heading: "'Playfair Display', serif" },
  { id: "friendly", name: "Friendly", description: "Nunito everywhere", body: "'Nunito', sans-serif", heading: "'Nunito', sans-serif" },
  { id: "structured", name: "Structured", description: "Roboto + Roboto Slab", body: "'Roboto', sans-serif", heading: "'Roboto Slab', serif" },
  { id: "code", name: "Codeblock", description: "JetBrains Mono everywhere", body: "'JetBrains Mono', monospace", heading: "'JetBrains Mono', monospace" },
];

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [hasLoadedPersistedTasks, setHasLoadedPersistedTasks] = useState(false);
  const [teams, setTeams] = useState<Team[]>([...teamData]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const activeTeam = teams[activeTeamIndex];
  const [activeSection, setActiveSection] = useState("projects");
  const [selectedProject, setSelectedProject] = useState<Project>(activeTeam.projects[0]);
  const [activeView, setActiveView] = useState("Board");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("backlog");
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskMenuId, setTaskMenuId] = useState<number | null>(null);
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [issueDraft, setIssueDraft] = useState({ title: "", description: "", priority: "Medium" as Priority, due: "" });
  const [showAssignees, setShowAssignees] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [projectMenu, setProjectMenu] = useState<Project | null>(null);
  const [editingProjectDetails, setEditingProjectDetails] = useState<Project | null>(null);
  const [projectDraft, setProjectDraft] = useState({ name: "", description: "" });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEmail, setProfileEmail] = useState("mina.patel@northstar.app");
  const [profileRole, setProfileRole] = useState("Admin");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamProjects, setNewTeamProjects] = useState("");
  const [newTeamPeople, setNewTeamPeople] = useState("");
  const [infoModal, setInfoModal] = useState<"about" | "contact" | null>(null);
  const infoModalRef = useRef<HTMLDivElement | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"theme" | "font">("theme");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activePriorities, setActivePriorities] = useState<Priority[]>([]);
  const [activeAssignees, setActiveAssignees] = useState<string[]>([]);
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Team member");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("kanban-theme");
    const savedFont = localStorage.getItem("kanban-font");
    if (savedTheme && THEMES.some((theme) => theme.id === savedTheme)) setThemeId(savedTheme);
    if (savedFont && FONTS.some((font) => font.id === savedFont)) setFontId(savedFont);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadPersistedTasks() {
      if (typeof fetch !== "function") {
        setHasLoadedPersistedTasks(true);
        return;
      }

      try {
        const response = await fetch("/api/board", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { tasks?: Task[] | null };
        if (isCurrent && Array.isArray(data.tasks)) setTasks(data.tasks);
      } catch {
        // The seeded board remains available until a database is configured.
      } finally {
        if (isCurrent) setHasLoadedPersistedTasks(true);
      }
    }

    void loadPersistedTasks();
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedTasks || typeof fetch !== "function") return;

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [hasLoadedPersistedTasks, tasks]);

  useEffect(() => {
    const theme = THEMES.find((candidate) => candidate.id === themeId) ?? THEMES[0];
    const root = document.documentElement.style;
    (Object.entries(theme.colors) as [string, string][]).forEach(([key, value]) => root.setProperty(`--${key}`, value));
    localStorage.setItem("kanban-theme", themeId);
  }, [themeId]);

  useEffect(() => {
    const font = FONTS.find((candidate) => candidate.id === fontId) ?? FONTS[0];
    const root = document.documentElement.style;
    root.setProperty("--font-body", font.body);
    root.setProperty("--font-heading", font.heading);
    localStorage.setItem("kanban-font", fontId);
  }, [fontId]);

  useEffect(() => {
    if (!infoModal || !infoModalRef.current) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = infoModalRef.current;
    const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const firstFocusable = focusable[0] ?? dialog;
    const lastFocusable = focusable[focusable.length - 1] ?? dialog;
    firstFocusable.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInfoModal(null);
        return;
      }

      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [infoModal]);

  const projectTasks = useMemo(() => tasks.filter((task) => task.team === activeTeam.name && task.project === selectedProject), [tasks, activeTeam.name, selectedProject]);
  const projectTaskCounts = useMemo(() => Object.fromEntries(activeTeam.projects.map((project) => [project, tasks.filter((task) => task.team === activeTeam.name && task.project === project).length])), [tasks, activeTeam]);
  const assigneeOptions = useMemo(() => Array.from(new Set(projectTasks.map((task) => task.assignee))).sort(), [projectTasks]);
  const labelOptions = useMemo(() => Array.from(new Set(projectTasks.flatMap((task) => task.labels))).sort(), [projectTasks]);
  const activeFilterCount = activePriorities.length + activeAssignees.length + activeLabels.length;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const filteredTasks = useMemo(() => projectTasks.filter((task) => {
    const text = `${task.title} ${task.description} ${task.labels.join(" ")}`.toLowerCase();
    if (!text.includes(query.toLowerCase())) return false;
    if (activePriorities.length > 0 && !activePriorities.includes(task.priority)) return false;
    if (activeAssignees.length > 0 && !activeAssignees.includes(task.assignee)) return false;
    if (activeLabels.length > 0 && !task.labels.some((label) => activeLabels.includes(label))) return false;
    return true;
  }), [projectTasks, query, activePriorities, activeAssignees, activeLabels]);
  const timelineTasks = useMemo(() => [...filteredTasks].sort((first, second) => {
    const dueValue = (due: string) => due === "Today" ? 0 : due === "No due date" ? Number.MAX_SAFE_INTEGER : Date.parse(`${due}, 2024`);
    return dueValue(first.due) - dueValue(second.due);
  }), [filteredTasks]);
  const currentProject = activeTeam.projectDetails[selectedProject] ?? { color: "blue", eyebrow: "NEW PROJECT", description: "A new project ready to take shape." };

  function togglePriorityFilter(priority: Priority) {
    setActivePriorities((current) => current.includes(priority) ? current.filter((item) => item !== priority) : [...current, priority]);
  }

  function toggleAssigneeFilter(assignee: string) {
    setActiveAssignees((current) => current.includes(assignee) ? current.filter((item) => item !== assignee) : [...current, assignee]);
  }

  function toggleLabelFilter(label: string) {
    setActiveLabels((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  function clearFilters() {
    setActivePriorities([]);
    setActiveAssignees([]);
    setActiveLabels([]);
  }

  function invitePerson() {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }

    const localPart = email.split("@")[0];
    const name = localPart.split(/[._-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const person: Person = { name, role: inviteRole, initials, color: "blue" };
    const updatedTeam = {
      ...activeTeam,
      people: [...activeTeam.people, person],
      inboxItems: [{ title: `Invitation sent to ${email}`, detail: `${name} was invited to ${activeTeam.name}`, time: "Just now", initials, color: "blue" }, ...activeTeam.inboxItems],
    };
    setTeams((current) => current.map((team, index) => index === activeTeamIndex ? updatedTeam : team));
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("Team member");
    setInviteError("");

    const subject = encodeURIComponent(`You're invited to ${activeTeam.name} on Northstar`);
    const body = encodeURIComponent(`Hi,\n\nMina Patel invited you to join the ${activeTeam.name} workspace on Northstar.\n\nOpen Northstar to collaborate with the team.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function deleteTask(taskId: number) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setTaskMenuId(null);
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  }

  function beginIssueEdit() {
    if (!selectedTask) return;
    setIssueDraft({ title: selectedTask.title, description: selectedTask.description, priority: selectedTask.priority, due: selectedTask.due });
    setIsEditingIssue(true);
  }

  function saveIssueEdit() {
    if (!selectedTask || !issueDraft.title.trim()) return;
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, ...issueDraft, title: issueDraft.title.trim(), description: issueDraft.description.trim() } : task));
    setIsEditingIssue(false);
  }

  function addComment() {
    if (!selectedTask || !newComment.trim()) return;
    const comment: Comment = { id: Date.now(), author: "Mina Patel", date: "Just now", text: newComment.trim() };
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, comments: [...task.comments, comment] } : task));
    setNewComment("");
  }

  function saveComment() {
    if (!selectedTask || editingCommentId === null || !editingCommentText.trim()) return;
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, comments: task.comments.map((comment) => comment.id === editingCommentId ? { ...comment, text: editingCommentText.trim(), date: "Just now" } : comment) } : task));
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  function toggleTaskAssignee(person: Person) {
    if (!selectedTask) return;
    setTasks((current) => current.map((task) => {
      if (task.id !== selectedTask.id) return task;
      const isAssigned = task.assignees.some((assignee) => assignee.name === person.name);
      const assignees = isAssigned ? task.assignees.filter((assignee) => assignee.name !== person.name) : [...task.assignees, { name: person.name, initials: person.initials, color: person.color }];
      return { ...task, assignees };
    }));
  }

  function addProject() {
    const baseName = "New project";
    let projectName = baseName;
    let suffix = 2;
    while (activeTeam.projects.includes(projectName)) projectName = `${baseName} ${suffix++}`;
    const updatedTeam = { ...activeTeam, projects: [...activeTeam.projects, projectName] };
    const updatedTeams = teams.map((team, index) => index === activeTeamIndex ? updatedTeam : team);
    setTeams(updatedTeams);
    setSelectedProject(projectName);
    setActiveSection("projects");
    setEditingProject(projectName);
    setEditingValue(projectName);
  }

  function createTeam() {
    if (!newTeamName.trim()) return;
    const teamName = newTeamName.trim();
    const projectList = newTeamProjects.split(",").map((p) => p.trim()).filter(Boolean);
    const peopleList = newTeamPeople.split(",").map((p) => p.trim()).filter(Boolean).map((name) => ({
      name,
      role: "Team member",
      initials: name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
      color: "blue" as const,
    }));
    const newTeam: Team = {
      name: teamName,
      projects: projectList.length > 0 ? projectList : ["New project"],
      people: peopleList,
      inboxItems: [],
      projectDetails: {},
    };
    setTeams([...teams, newTeam]);
    setActiveTeamIndex(teams.length);
    setSelectedProject(newTeam.projects[0]);
    setActiveSection("projects");
    setShowNewTeamModal(false);
    setNewTeamName("");
    setNewTeamProjects("");
    setNewTeamPeople("");
  }

  function startRenameProject(project: Project, event: React.MouseEvent) {
    event.stopPropagation();
    setEditingProject(project);
    setEditingValue(project);
  }

  function commitRenameProject() {
    if (!editingProject) return;
    const trimmed = editingValue.trim();
    if (!trimmed) { setEditingProject(null); return; }
    let finalName = trimmed;
    let suffix = 2;
    while (activeTeam.projects.includes(finalName) && finalName !== editingProject) finalName = `${trimmed} ${suffix++}`;
    const updatedProjects = activeTeam.projects.map((project) => (project === editingProject ? finalName : project));
    const updatedTeam = { ...activeTeam, projects: updatedProjects };
    const updatedTeams = teams.map((team, index) => index === activeTeamIndex ? updatedTeam : team);
    setTeams(updatedTeams);
    setTasks((current) => current.map((task) => task.team === activeTeam.name && task.project === editingProject ? { ...task, project: finalName } : task));
    setSelectedProject((current) => (current === editingProject ? finalName : current));
    setEditingProject(null);
  }

  function openProjectEditor(project: Project) {
    const details = activeTeam.projectDetails[project] ?? { description: "A new project ready to take shape." };
    setProjectDraft({ name: project, description: details.description });
    setEditingProjectDetails(project);
    setProjectMenu(null);
  }

  function saveProjectEdit() {
    if (!editingProjectDetails) return;
    const trimmedName = projectDraft.name.trim();
    if (!trimmedName) return;

    let finalName = trimmedName;
    let suffix = 2;
    while (activeTeam.projects.includes(finalName) && finalName !== editingProjectDetails) finalName = `${trimmedName} ${suffix++}`;

    const currentDetails = activeTeam.projectDetails[editingProjectDetails] ?? { color: "blue", eyebrow: "NEW PROJECT", description: "" };
    const { [editingProjectDetails]: _previousDetails, ...remainingProjectDetails } = activeTeam.projectDetails;
    const updatedTeam = {
      ...activeTeam,
      projects: activeTeam.projects.map((project) => project === editingProjectDetails ? finalName : project),
      projectDetails: {
        ...remainingProjectDetails,
        [finalName]: { ...currentDetails, description: projectDraft.description.trim() },
      },
    };

    setTeams((current) => current.map((team, index) => index === activeTeamIndex ? updatedTeam : team));
    setTasks((current) => current.map((task) => task.team === activeTeam.name && task.project === editingProjectDetails ? { ...task, project: finalName } : task));
    setSelectedProject((current) => current === editingProjectDetails ? finalName : current);
    setEditingProjectDetails(null);
  }

  function deleteProject(project: Project) {
    const projectIndex = activeTeam.projects.indexOf(project);
    const updatedProjects = activeTeam.projects.filter((item) => item !== project);
    const { [project]: removedProject, ...updatedProjectDetails } = activeTeam.projectDetails;
    const updatedTeam = { ...activeTeam, projects: updatedProjects, projectDetails: updatedProjectDetails };
    setTeams((current) => current.map((team, index) => index === activeTeamIndex ? updatedTeam : team));
    setTasks((current) => current.filter((task) => task.team !== activeTeam.name || task.project !== project));
    setSelectedProject((current) => current === project ? updatedProjects[projectIndex] ?? updatedProjects[projectIndex - 1] ?? "" : current);
    setProjectMenu(null);
  }

  function copyProjectLink() {
    const link = `https://northstar.app/projects/${encodeURIComponent(selectedProject)}`;
    navigator.clipboard?.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  function addTask() {
    if (!newTitle.trim()) return;
    setTasks((current) => [...current, {
      id: Date.now(), team: activeTeam.name, project: selectedProject, title: newTitle.trim(), description: "A new task ready to be shaped.", status: newStatus,
      priority: newPriority, due: "No due date", labels: ["New"], assignee: "You", initials: "YU", color: "blue", assignees: [{ name: "Mina Patel", initials: "MP", color: "coral" }], comments: [],
    }]);
    setNewTitle("");
    setShowModal(false);
  }

  function moveTask(status: Status) {
    if (draggedId === null) return;
    setTasks((current) => {
      const draggedTask = current.find((task) => task.id === draggedId);
      if (!draggedTask) return current;
      const withoutDragged = current.filter((task) => task.id !== draggedId);
      const lastTaskIndex = withoutDragged.reduce((lastIndex, task, index) => task.status === status ? index : lastIndex, -1);
      withoutDragged.splice(lastTaskIndex + 1, 0, { ...draggedTask, status });
      return withoutDragged;
    });
    setDraggedId(null);
    setDraggedOverId(null);
  }

  function reorderTask(targetId: number) {
    if (draggedId === null || draggedId === targetId) return;
    setTasks((current) => {
      const draggedIndex = current.findIndex((task) => task.id === draggedId);
      const targetIndex = current.findIndex((task) => task.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0) return current;
      const draggedTask = current[draggedIndex];
      const targetTask = current[targetIndex];
      const withoutDragged = current.filter((task) => task.id !== draggedId);
      let updatedTargetIndex = withoutDragged.findIndex((task) => task.id === targetId);
      // dragging downward should drop after the target card, not before it
      if (draggedIndex < targetIndex) updatedTargetIndex += 1;
      withoutDragged.splice(updatedTargetIndex, 0, { ...draggedTask, status: targetTask.status });
      return withoutDragged;
    });
    setDraggedId(null);
    setDraggedOverId(null);
  }

  return (
    <main className="app-shell">
      {selectedTask && <div className="modal-backdrop" onMouseDown={() => { setSelectedTaskId(null); setShowAssignees(false); setEditingCommentId(null); setIsEditingIssue(false); }}><div className="modal issue-modal" role="dialog" aria-modal="true" aria-labelledby="issue-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">{selectedProject.toUpperCase()} / {selectedTask.status}</span>{isEditingIssue ? <input className="issue-title-input" aria-label="Issue title" value={issueDraft.title} onChange={(event) => setIssueDraft((current) => ({ ...current, title: event.target.value }))} /> : <h2 id="issue-modal-title">{selectedTask.title}</h2>}</div>{isEditingIssue ? <div className="issue-edit-actions"><button className="close-button" aria-label="Discard issue changes" onClick={() => setIsEditingIssue(false)}><X size={18} /></button><button className="add-button" onClick={saveIssueEdit}>Save</button></div> : <><button className="person-action" onClick={beginIssueEdit}>Edit issue</button><button className="close-button" onClick={() => { setSelectedTaskId(null); setShowAssignees(false); }} aria-label="Close"><X size={18} /></button></>}</div>{isEditingIssue ? <div className="issue-fields"><label>Description<textarea value={issueDraft.description} onChange={(event) => setIssueDraft((current) => ({ ...current, description: event.target.value }))} /></label><div className="modal-fields"><label>Priority<select value={issueDraft.priority} onChange={(event) => setIssueDraft((current) => ({ ...current, priority: event.target.value as Priority }))}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Due date<input value={issueDraft.due} onChange={(event) => setIssueDraft((current) => ({ ...current, due: event.target.value }))} /></label></div></div> : <p className="issue-description">{selectedTask.description}</p>}<div className="issue-assignees"><div><strong>Assigned to</strong><div className="assignee-stack">{selectedTask.assignees.slice(0, 3).map((assignee) => <span className={`avatar avatar-${assignee.color}`} key={assignee.name}>{assignee.initials}</span>)}{selectedTask.assignees.length > 3 && <span className="assignee-overflow">+{selectedTask.assignees.length - 3}</span>}</div></div><button className="person-action" onClick={() => setShowAssignees((current) => !current)}>{showAssignees ? "Done" : "Manage people"}</button></div>{showAssignees && <div className="assignee-panel">{activeTeam.people.map((person) => { const assigned = selectedTask.assignees.some((assignee) => assignee.name === person.name); return <label key={person.name}><input type="checkbox" checked={assigned} onChange={() => toggleTaskAssignee(person)} /><span className={`avatar avatar-${person.color}`}>{person.initials}</span>{person.name}</label>; })}</div>}<div className="comments-section"><h3>Comments <span>{selectedTask.comments.length}</span></h3><div className="comments-list">{selectedTask.comments.map((comment) => <article className="comment" key={comment.id}><div className="avatar avatar-coral">{comment.author === "Mina Patel" ? "MP" : comment.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="comment-content"><div><strong>{comment.author}</strong><time>{comment.date}</time>{comment.author === "Mina Patel" && editingCommentId !== comment.id && <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }}>Edit</button>}</div>{editingCommentId === comment.id ? <div className="comment-edit"><input value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} /><button onClick={saveComment}>Save</button><button onClick={() => setEditingCommentId(null)}>Cancel</button></div> : <p>{comment.text}</p>}</div></article>)}</div><div className="comment-composer"><input value={newComment} onChange={(event) => setNewComment(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addComment()} placeholder="Add a comment" /><button className="add-button" onClick={addComment}>Comment</button></div></div></div></div>}
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>northstar</span></div>
        <div className="workspace-select-wrap">
          <button type="button" className="workspace-select" aria-expanded={showWorkspaceMenu} aria-controls="workspace-panel" onClick={() => setShowWorkspaceMenu((c) => !c)}><span className="workspace-avatar">{activeTeam.name[0]}</span><span className="workspace-meta"><strong>Northstar</strong><small>{activeTeam.name}</small></span><ChevronDown size={15} /></button>
          {showWorkspaceMenu && <>
            <div className="ws-backdrop" onClick={() => setShowWorkspaceMenu(false)} />
            <div className="ws-panel" id="workspace-panel">
              <div className="ws-panel-heading">
                <h4>Teams</h4>
                <button onClick={() => { setShowNewTeamModal(true); setShowWorkspaceMenu(false); }}><Plus size={14} /> New team</button>
              </div>
              <div className="ws-teams">
                {teams.map((team, index) => (
                  <button key={team.name} className="ws-team-row" onClick={() => { setActiveTeamIndex(index); setSelectedProject(team.projects[0]); setShowWorkspaceMenu(false); }}>
                    <div className="workspace-avatar">{team.name[0]}</div>
                    <div>
                      <strong>{team.name}</strong>
                      <small>{team.projects.length} projects · {team.people.length} people</small>
                    </div>
                    {index === activeTeamIndex && <span className="ws-current">Current</span>}
                  </button>
                ))}
              </div>
              <div className="ws-divider" />
              <div className="ws-people">
                {activeTeam.people.map((person) => (
                  <button key={person.name} className="ws-person-row" onClick={() => { setViewingPerson(person); setShowWorkspaceMenu(false); }}>
                    <div className={`avatar avatar-${person.color}`}>{person.initials}</div>
                    <div>
                      <strong>{person.name}</strong>
                      <small>{person.role}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>}
        </div>
        <nav className="primary-nav">
          <button className={activeSection === "inbox" ? "active" : ""} onClick={() => setActiveSection("inbox")}><Inbox size={17} /> Inbox <span className="nav-count">4</span></button>
          <button className={activeSection === "projects" ? "active" : ""} onClick={() => setActiveSection("projects")}><LayoutGrid size={17} /> Projects</button>
          <button className={activeSection === "people" ? "active" : ""} onClick={() => setActiveSection("people")}><Users size={17} /> People</button>
        </nav>
        <div className="nav-label">Your projects <button aria-label="Add project" onClick={addProject}><Plus size={15} /></button></div>
        <nav className="project-nav">{activeTeam.projects.map((project) => editingProject === project ? <input key={project} autoFocus className="project-rename-input" value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onBlur={commitRenameProject} onKeyDown={(event) => { if (event.key === "Enter") commitRenameProject(); if (event.key === "Escape") setEditingProject(null); }} /> : <div className="project-row" key={project}><button className={selectedProject === project ? "project-active" : ""} onClick={() => { setSelectedProject(project); setActiveSection("projects"); }} onDoubleClick={(event) => startRenameProject(project, event)}><span className={`project-dot ${activeTeam.projectDetails[project]?.color ?? "blue"}`} />{project}<span className="project-count">{projectTaskCounts[project]}</span></button><button className="project-options-button" aria-label={`Options for ${project}`} aria-expanded={projectMenu === project} onClick={(event) => { event.stopPropagation(); setProjectMenu((current) => current === project ? null : project); }}><MoreHorizontal size={15} /></button>{projectMenu === project && <><div className="project-menu-backdrop" onClick={() => setProjectMenu(null)} /><div className="project-options-menu"><button onClick={() => openProjectEditor(project)}>Edit</button><button className="delete-project-button" onClick={() => deleteProject(project)}>Delete</button></div></>}</div>)}</nav>
        <div className="sidebar-footer"><button onClick={() => setInfoModal("about")}><CircleHelp size={17} /> About</button><button onClick={() => setInfoModal("contact")}><Inbox size={17} /> Contact us</button><button onClick={() => setShowSettingsModal(true)}><Settings2 size={17} /> Workspace settings</button><button className="profile" onClick={() => setShowProfileModal(true)}><div className="avatar avatar-coral">MP</div><div><strong>Mina Patel</strong><small>{profileRole}</small></div><MoreHorizontal size={16} /></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>{activeTeam.name}</span><span>/</span><strong>{selectedProject}</strong></div><div className="top-actions"><div className="notif-wrap"><button className="icon-button" aria-label="Notifications" onClick={() => setShowNotifications((current) => !current)}><Bell size={18} /><i /></button>{showNotifications && <><div className="notif-backdrop" onClick={() => setShowNotifications(false)} /><div className="notif-panel"><h4>Notifications</h4><div className="notif-list">{activeTeam.inboxItems.map((item) => <div className="notif-row" key={item.title}><div className={`avatar avatar-${item.color}`}>{item.initials}</div><div className="notif-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div><button className="notif-view-all" onClick={() => { setActiveSection("inbox"); setShowNotifications(false); }}>View all in inbox</button></div></>}</div><button className="share-button" onClick={() => setShowShareModal(true)}><Users size={16} /> Share</button><button type="button" className="top-profile-button" aria-label="Open profile settings" onClick={() => setShowProfileModal(true)}><span className="avatar avatar-coral">MP</span></button></div></header>
        <div className="content">
          {activeSection === "projects" ? <>
          <div className="project-heading"><div><div className="eyebrow"><span className={`project-dot ${currentProject.color}`} /> {currentProject.eyebrow}</div><h1>{selectedProject} <span className="private-pill">Private</span></h1><p>{currentProject.description}</p></div></div>
          <div className="toolbar"><div className="view-tabs">{["Board", "List", "Timeline"].map((view) => <button key={view} className={activeView === view ? "selected" : ""} onClick={() => setActiveView(view)}>{view === "Board" && <LayoutGrid size={15} />}{view === "List" && <ListFilter size={15} />}{view === "Timeline" && <ArrowDownUp size={15} />}{view}</button>)}</div><div className="toolbar-right"><label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label><div className="filter-wrap"><button className="filter-button" aria-expanded={showFilterMenu} onClick={() => setShowFilterMenu((current) => !current)}><Filter size={15} /> Filter {activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button>{showFilterMenu && <><div className="filter-backdrop" onClick={() => setShowFilterMenu(false)} /><div className="filter-panel"><div className="filter-panel-heading"><h4>Filter tasks</h4>{activeFilterCount > 0 && <button className="filter-clear" onClick={clearFilters}>Clear all</button>}</div><div className="filter-group"><p className="filter-group-title">Priority</p><div className="filter-chips">{(["High", "Medium", "Low"] as Priority[]).map((priority) => <button key={priority} className={activePriorities.includes(priority) ? "chip selected" : "chip"} onClick={() => togglePriorityFilter(priority)}>{priority}</button>)}</div></div><div className="filter-group"><p className="filter-group-title">Assignee</p><div className="filter-chips">{assigneeOptions.map((assignee) => <button key={assignee} className={activeAssignees.includes(assignee) ? "chip selected" : "chip"} onClick={() => toggleAssigneeFilter(assignee)}>{assignee}</button>)}</div></div><div className="filter-group"><p className="filter-group-title">Label</p><div className="filter-chips">{labelOptions.map((label) => <button key={label} className={activeLabels.includes(label) ? "chip selected" : "chip"} onClick={() => toggleLabelFilter(label)}>{label}</button>)}</div></div></div></>}</div><button className="sort-button" aria-label="Sort tasks"><ArrowDownUp size={16} /></button><button className="add-button" onClick={() => setShowModal(true)}><Plus size={17} /> Add task</button></div></div>
          {activeView === "Board" ? <div className="board">{columns.map((column) => { const columnTasks = filteredTasks.filter((task) => task.status === column.id); return <section className="kanban-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => moveTask(column.id)}><div className="column-heading"><div><span className={`column-dot ${column.accent}`} /><h2>{column.name}</h2><span className="task-count">{columnTasks.length}</span></div><button aria-label={`Options for ${column.name}`}><MoreHorizontal size={17} /></button></div><div className="task-list">{columnTasks.map((task) => <article className={`task-card ${draggedOverId === task.id ? "drag-over" : ""}`} key={task.id} draggable onClick={() => setSelectedTaskId(task.id)} onDragStart={() => setDraggedId(task.id)} onDragEnd={() => { setDraggedId(null); setDraggedOverId(null); }} onDragOver={(event) => { event.preventDefault(); setDraggedOverId(task.id); }} onDrop={(event) => { event.stopPropagation(); reorderTask(task.id); }}><div className="card-top"><span className={`priority ${priorityClass[task.priority]}`}><span />{task.priority}</span><button aria-label={`Options for ${task.title}`} onClick={(event) => { event.stopPropagation(); setTaskMenuId((current) => current === task.id ? null : task.id); }}><MoreHorizontal size={16} /></button>{taskMenuId === task.id && <><div className="task-menu-backdrop" onClick={(event) => { event.stopPropagation(); setTaskMenuId(null); }} /><div className="task-options-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => deleteTask(task.id)}>Delete task</button></div></>}</div><h3>{task.title}</h3><p>{task.description}</p><div className="labels">{task.labels.map((label) => <span key={label}>{label}</span>)}</div><div className="card-footer"><button className="assignee-stack" aria-label={`View assignees for ${task.title}`} onClick={(event) => { event.stopPropagation(); setSelectedTaskId(task.id); setShowAssignees(true); }}>{task.assignees.slice(0, 3).map((assignee) => <span className={`avatar avatar-${assignee.color}`} key={assignee.name}>{assignee.initials}</span>)}{task.assignees.length > 3 && <span className="assignee-overflow">+{task.assignees.length - 3}</span>}</button><div className={task.due === "Today" ? "due today" : "due"}>{task.due === "Today" && <span className="due-dot" />}{task.due}</div><Check size={15} className="check-icon" /></div></article>)}</div><button className="column-add" onClick={() => { setNewStatus(column.id); setShowModal(true); }}><Plus size={16} /> Add task</button></section>; })}</div> : activeView === "List" ? <div className="list-view"><div className="list-header"><span>Task</span><span>Status</span><span>Priority</span><span>Assignees</span><span>Due date</span></div>{filteredTasks.length === 0 ? <p className="empty-state">No tasks match the current filters.</p> : filteredTasks.map((task) => <button className="list-row" key={task.id} onClick={() => setSelectedTaskId(task.id)}><strong>{task.title}</strong><span className={`list-status ${task.status}`}>{columns.find((column) => column.id === task.status)?.name}</span><span className={`priority ${priorityClass[task.priority]}`}><i />{task.priority}</span><span className="assignee-stack">{task.assignees.slice(0, 3).map((assignee) => <i className={`avatar avatar-${assignee.color}`} key={assignee.name}>{assignee.initials}</i>)}{task.assignees.length > 3 && <i className="assignee-overflow">+{task.assignees.length - 3}</i>}</span><span className={task.due === "Today" ? "due today" : "due"}>{task.due}</span></button>)}</div> : <div className="timeline-view">{timelineTasks.length === 0 ? <p className="empty-state">No tasks with due dates match the current filters.</p> : timelineTasks.map((task) => <button className="timeline-item" key={task.id} onClick={() => setSelectedTaskId(task.id)}><time>{task.due}</time><span className={`timeline-marker ${task.status}`} /><div><strong>{task.title}</strong><p>{columns.find((column) => column.id === task.status)?.name} · {task.priority} priority</p></div><span className="assignee-stack">{task.assignees.slice(0, 3).map((assignee) => <i className={`avatar avatar-${assignee.color}`} key={assignee.name}>{assignee.initials}</i>)}{task.assignees.length > 3 && <i className="assignee-overflow">+{task.assignees.length - 3}</i>}</span></button>)}</div>}
          </> : activeSection === "inbox" ? <div className="section-view"><div className="section-heading"><div><div className="eyebrow"><Inbox size={13} /> YOUR INBOX</div><h1>Inbox <span className="private-pill">{activeTeam.inboxItems.length} unread</span></h1><p>Updates and conversations that need your attention.</p></div><button className="add-button" onClick={() => setActiveSection("projects")}><FolderKanban size={16} /> View projects</button></div><div className="inbox-list">{activeTeam.inboxItems.length === 0 ? <p className="empty-state">No notifications yet for this team.</p> : activeTeam.inboxItems.map((item) => <article className="inbox-item" key={item.title}><div className={`avatar avatar-${item.color}`}>{item.initials}</div><div className="inbox-copy"><h3>{item.title}</h3><p>{item.detail}</p></div><time>{item.time}</time><button className="inbox-check" aria-label={`Mark ${item.title} as read`}><Check size={16} /></button></article>)}</div></div> : <div className="section-view"><div className="section-heading"><div><div className="eyebrow"><Users size={13} /> {activeTeam.name.toUpperCase()}</div><h1>People</h1><p>Everyone working in the {activeTeam.name}.</p></div><button className="add-button" onClick={() => setShowInviteModal(true)}><Plus size={17} /> Invite people</button></div><div className="people-grid">{activeTeam.people.map((person) => <article className="person-card" key={person.name}><div className={`avatar avatar-${person.color} person-avatar`}>{person.initials}</div><h3>{person.name}</h3><p>{person.role}</p><span>{activeTeam.projects.join(", ")}</span><button className="person-action" onClick={() => setViewingPerson(person)}>View profile</button></article>)}</div></div>}
        </div>
      </section>

      {editingProjectDetails && <div className="modal-backdrop" onMouseDown={() => setEditingProjectDetails(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-editor-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">PROJECT SETTINGS</span><h2 id="project-editor-title">Edit project</h2></div><button className="close-button" onClick={() => setEditingProjectDetails(null)} aria-label="Close"><X size={18} /></button></div><label>Project name<input autoFocus value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} /></label><label className="invite-role-label">Description<textarea value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} /></label><div className="modal-actions"><button className="cancel-button" onClick={() => setEditingProjectDetails(null)}>Cancel</button><button className="add-button" onClick={saveProjectEdit}>Save changes</button></div></div></div>}

      {showNewTeamModal && <div className="modal-backdrop" onMouseDown={() => setShowNewTeamModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEW TEAM</span><h2>Create a product team</h2></div><button className="close-button" onClick={() => setShowNewTeamModal(false)} aria-label="Close"><X size={18} /></button></div><label>Team name<input autoFocus value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="e.g. Marketing team" /></label><label>Projects <small>(comma separated)</small><input value={newTeamProjects} onChange={(event) => setNewTeamProjects(event.target.value)} placeholder="e.g. Campaign site, Brand assets" /></label><label>People <small>(comma separated names)</small><input value={newTeamPeople} onChange={(event) => setNewTeamPeople(event.target.value)} placeholder="e.g. Alex Chen, Priya Sharma" /></label><div className="modal-actions"><button className="cancel-button" onClick={() => setShowNewTeamModal(false)}>Cancel</button><button className="add-button" onClick={createTeam}><Plus size={17} /> Create team</button></div></div></div>}

      {showModal && <div className="modal-backdrop" onMouseDown={() => setShowModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEW TASK</span><h2>Add to the project</h2></div><button className="close-button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button></div><label>Task name<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Sketch the new homepage" /></label><div className="modal-fields"><label>Status<select value={newStatus} onChange={(event) => setNewStatus(event.target.value as Status)}>{columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label><label>Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select></label></div><div className="modal-actions"><button className="cancel-button" onClick={() => setShowModal(false)}>Cancel</button><button className="add-button" onClick={addTask}><Plus size={17} /> Create task</button></div></div></div>}

      {showInviteModal && <div className="modal-backdrop" onMouseDown={() => setShowInviteModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">INVITE TO WORKSPACE</span><h2 id="invite-modal-title">Invite a teammate</h2></div><button className="close-button" onClick={() => setShowInviteModal(false)} aria-label="Close"><X size={18} /></button></div><label>Email address<input autoFocus type="email" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteError(""); }} onKeyDown={(event) => event.key === "Enter" && invitePerson()} placeholder="name@company.com" /></label><label className="invite-role-label">Workspace role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option>Team member</option><option>Project manager</option><option>Viewer</option></select></label>{inviteError && <p className="form-error" role="alert">{inviteError}</p>}<div className="modal-actions"><button className="cancel-button" onClick={() => setShowInviteModal(false)}>Cancel</button><button className="add-button" onClick={invitePerson}><Mail size={16} /> Send invitation</button></div></div></div>}

      {showShareModal && <div className="modal-backdrop" onMouseDown={() => setShowShareModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">SHARE PROJECT</span><h2>{selectedProject}</h2></div><button className="close-button" onClick={() => setShowShareModal(false)} aria-label="Close"><X size={18} /></button></div><label>Invite by link<div className="share-link-row"><input readOnly value={`https://northstar.app/projects/${encodeURIComponent(selectedProject)}`} /><button className="add-button" onClick={copyProjectLink}>{linkCopied ? "Copied!" : "Copy link"}</button></div></label><div className="share-people">{activeTeam.people.map((person) => <div className="share-person-row" key={person.name}><div className={`avatar avatar-${person.color}`}>{person.initials}</div><div><strong>{person.name}</strong><small>{person.role}</small></div></div>)}</div><div className="modal-actions"><button className="cancel-button" onClick={() => setShowShareModal(false)}>Done</button></div></div></div>}

      {showProfileModal && <div className="modal-backdrop" onMouseDown={() => setShowProfileModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">YOUR PROFILE</span><h2 id="profile-modal-title">Profile settings</h2></div><button className="close-button" onClick={() => setShowProfileModal(false)} aria-label="Close"><X size={18} /></button></div><label>Name<input value="Mina Patel" readOnly aria-label="Name" /></label><label className="invite-role-label">Email address<input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} /></label><label className="invite-role-label">Workspace role<select value={profileRole} onChange={(event) => setProfileRole(event.target.value)}><option>Admin</option><option>Project manager</option><option>Team member</option></select></label><div className="modal-actions"><button className="cancel-button signout-button" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button><button className="cancel-button" onClick={() => setShowProfileModal(false)}>Cancel</button><button className="add-button" onClick={() => setShowProfileModal(false)}>Save changes</button></div></div></div>}

      {infoModal && <div className="modal-backdrop" onMouseDown={() => setInfoModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title" ref={infoModalRef} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">{infoModal === "about" ? "ABOUT NORTHSTAR" : "CONTACT US"}</span><h2 id="info-modal-title">{infoModal === "about" ? "About Northstar" : "Get in touch"}</h2></div><button className="close-button" onClick={() => setInfoModal(null)} aria-label="Close"><X size={18} /></button></div>{infoModal === "about" ? <div className="profile-modal-body"><div><strong>Northstar keeps teams aligned on projects, tasks, and people.</strong><p>Use the board, inbox, and people views to stay on top of your work in one place.</p></div></div> : <div className="profile-modal-body"><div><strong>Need help from the Northstar team?</strong><p>Email support@northstar.app and include your workspace name so we can follow up quickly.</p></div></div>}<div className="modal-actions"><button className="cancel-button" onClick={() => setInfoModal(null)}>Close</button></div></div></div>}

      {showSettingsModal && <div className="modal-backdrop" onMouseDown={() => setShowSettingsModal(false)}><div className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">WORKSPACE SETTINGS</span><h2 id="settings-modal-title">Appearance</h2></div><button className="close-button" onClick={() => setShowSettingsModal(false)} aria-label="Close"><X size={18} /></button></div>
        <div className="settings-tabs">
          <button className={settingsTab === "theme" ? "active" : ""} onClick={() => setSettingsTab("theme")}><Palette size={15} /> Theme</button>
          <button className={settingsTab === "font" ? "active" : ""} onClick={() => setSettingsTab("font")}><Type size={15} /> Font</button>
        </div>
        {settingsTab === "theme" ? <div>
          <p className="settings-section-title">Choose a design theme</p>
          <div className="theme-grid">
            {THEMES.map((theme) => <button key={theme.id} type="button" className={`theme-card ${themeId === theme.id ? "selected" : ""}`} onClick={() => setThemeId(theme.id)}>
              <div className="theme-preview"><span style={{ background: theme.colors.paper }} /><span style={{ background: theme.colors.sidebar }} /><span style={{ background: theme.colors.accent }} /><span style={{ background: theme.colors["accent-strong"] }} /></div>
              <div className="theme-card-name">{theme.name}{themeId === theme.id && <span className="theme-card-check"><Check size={11} /></span>}</div>
              <small>{theme.description}</small>
            </button>)}
          </div>
        </div> : <div>
          <p className="settings-section-title">Choose a font pairing</p>
          <div className="font-list">
            {FONTS.map((font) => <button key={font.id} type="button" className={`font-option ${fontId === font.id ? "selected" : ""}`} onClick={() => setFontId(font.id)}>
              <div className="font-option-copy"><span className="font-option-preview" style={{ fontFamily: font.heading }}>{font.name}</span><span className="font-option-name">{font.description}</span></div>
              <span className="font-option-check"><Check size={13} /></span>
            </button>)}
          </div>
        </div>}
        <div className="modal-actions"><button className="cancel-button" onClick={() => setShowSettingsModal(false)}>Done</button></div>
      </div></div>}

      {viewingPerson && <div className="modal-backdrop" onMouseDown={() => setViewingPerson(null)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">TEAM MEMBER</span><h2>{viewingPerson.name}</h2></div><button className="close-button" onClick={() => setViewingPerson(null)} aria-label="Close"><X size={18} /></button></div><div className="profile-modal-body"><div className={`avatar avatar-${viewingPerson.color} person-avatar`}>{viewingPerson.initials}</div><div><strong>{viewingPerson.role}</strong><p>Projects: {activeTeam.projects.join(", ")}</p></div></div><div className="modal-actions"><button className="cancel-button" onClick={() => setViewingPerson(null)}>Close</button></div></div></div>}
    </main>
  );
}
