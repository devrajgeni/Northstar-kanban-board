"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowDownUp,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Filter,
  FolderKanban,
  Inbox,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type Status = "backlog" | "progress" | "review" | "done";
type Priority = "High" | "Medium" | "Low";
type Project = string;

type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due: string;
  labels: string[];
  assignee: string;
  initials: string;
  color: string;
};

const initialTasks: Task[] = [
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

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
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
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingValue, setEditingValue] = useState("");
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

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const text = `${task.title} ${task.description} ${task.labels.join(" ")}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [tasks, query]);
  const currentProject = activeTeam.projectDetails[selectedProject] ?? { color: "blue", eyebrow: "NEW PROJECT", description: "A new project ready to take shape." };

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
    setSelectedProject((current) => (current === editingProject ? finalName : current));
    setEditingProject(null);
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
      id: Date.now(), title: newTitle.trim(), description: "A new task ready to be shaped.", status: newStatus,
      priority: newPriority, due: "No due date", labels: ["New"], assignee: "You", initials: "YU", color: "blue",
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
      const draggedTask = current.find((task) => task.id === draggedId);
      const targetIndex = current.findIndex((task) => task.id === targetId);
      if (!draggedTask || targetIndex < 0) return current;
      const withoutDragged = current.filter((task) => task.id !== draggedId);
      const updatedTargetIndex = withoutDragged.findIndex((task) => task.id === targetId);
      withoutDragged.splice(updatedTargetIndex, 0, { ...draggedTask, status: current[targetIndex].status });
      return withoutDragged;
    });
    setDraggedId(null);
    setDraggedOverId(null);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>northstar</span></div>
        <div className="workspace-select-wrap">
          <button type="button" className="workspace-select" onClick={() => setShowWorkspaceMenu((c) => !c)}><div className="workspace-avatar">{activeTeam.name[0]}</div><div><strong>Northstar</strong><small>{activeTeam.name}</small></div><ChevronDown size={15} /></button>
          {showWorkspaceMenu && <>
            <div className="ws-backdrop" onClick={() => setShowWorkspaceMenu(false)} />
            <div className="ws-panel">
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
        <nav className="project-nav">{activeTeam.projects.map((project) => editingProject === project ? <input key={project} autoFocus className="project-rename-input" value={editingValue} onChange={(event) => setEditingValue(event.target.value)} onBlur={commitRenameProject} onKeyDown={(event) => { if (event.key === "Enter") commitRenameProject(); if (event.key === "Escape") setEditingProject(null); }} /> : <button key={project} className={selectedProject === project ? "project-active" : ""} onClick={() => { setSelectedProject(project); setActiveSection("projects"); }} onDoubleClick={(event) => startRenameProject(project, event)}><span className={`project-dot ${activeTeam.projectDetails[project]?.color ?? "blue"}`} />{project}{project === "Mobile app" && <span className="project-count">8</span>}{project === "Website refresh" && <MoreHorizontal size={15} />}</button>)}</nav>
        <div className="sidebar-footer"><button onClick={() => setInfoModal("about")}><CircleHelp size={17} /> About</button><button onClick={() => setInfoModal("contact")}><Inbox size={17} /> Contact us</button><button><Settings2 size={17} /> Workspace settings</button><div className="profile"><div className="avatar avatar-coral">MP</div><div><strong>Mina Patel</strong><small>Admin</small></div><MoreHorizontal size={16} /></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>{activeTeam.name}</span><span>/</span><strong>{selectedProject}</strong></div><div className="top-actions"><div className="notif-wrap"><button className="icon-button" aria-label="Notifications" onClick={() => setShowNotifications((current) => !current)}><Bell size={18} /><i /></button>{showNotifications && <><div className="notif-backdrop" onClick={() => setShowNotifications(false)} /><div className="notif-panel"><h4>Notifications</h4><div className="notif-list">{activeTeam.inboxItems.map((item) => <div className="notif-row" key={item.title}><div className={`avatar avatar-${item.color}`}>{item.initials}</div><div className="notif-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div><button className="notif-view-all" onClick={() => { setActiveSection("inbox"); setShowNotifications(false); }}>View all in inbox</button></div></>}</div><button className="share-button" onClick={() => setShowShareModal(true)}><Users size={16} /> Share</button><div className="avatar avatar-coral">MP</div></div></header>
        <div className="content">
          {activeSection === "projects" ? <>
          <div className="project-heading"><div><div className="eyebrow"><span className={`project-dot ${currentProject.color}`} /> {currentProject.eyebrow}</div><h1>{selectedProject} <span className="private-pill">Private</span></h1><p>{currentProject.description}</p></div><button className="more-button" aria-label="Project options"><MoreHorizontal /></button></div>
          <div className="toolbar"><div className="view-tabs">{["Board", "List", "Timeline"].map((view) => <button key={view} className={activeView === view ? "selected" : ""} onClick={() => setActiveView(view)}>{view === "Board" && <LayoutGrid size={15} />}{view === "List" && <ListFilter size={15} />}{view === "Timeline" && <ArrowDownUp size={15} />}{view}</button>)}</div><div className="toolbar-right"><label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" /></label><button className="filter-button"><Filter size={15} /> Filter <span>2</span></button><button className="sort-button" aria-label="Sort tasks"><ArrowDownUp size={16} /></button><button className="add-button" onClick={() => setShowModal(true)}><Plus size={17} /> Add task</button></div></div>
          {activeView === "Board" ? <div className="board">{columns.map((column) => { const columnTasks = filteredTasks.filter((task) => task.status === column.id); return <section className="kanban-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => moveTask(column.id)}><div className="column-heading"><div><span className={`column-dot ${column.accent}`} /><h2>{column.name}</h2><span className="task-count">{columnTasks.length}</span></div><button aria-label={`Options for ${column.name}`}><MoreHorizontal size={17} /></button></div><div className="task-list">{columnTasks.map((task) => <article className={`task-card ${draggedOverId === task.id ? "drag-over" : ""}`} key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => { setDraggedId(null); setDraggedOverId(null); }} onDragOver={(event) => { event.preventDefault(); setDraggedOverId(task.id); }} onDrop={(event) => { event.stopPropagation(); reorderTask(task.id); }}><div className="card-top"><span className={`priority ${priorityClass[task.priority]}`}><span />{task.priority}</span><button aria-label={`Options for ${task.title}`}><MoreHorizontal size={16} /></button></div><h3>{task.title}</h3><p>{task.description}</p><div className="labels">{task.labels.map((label) => <span key={label}>{label}</span>)}</div><div className="card-footer"><div className={`avatar avatar-${task.color}`}>{task.initials}</div><div className={task.due === "Today" ? "due today" : "due"}>{task.due === "Today" && <span className="due-dot" />}{task.due}</div><Check size={15} className="check-icon" /></div></article>)}</div><button className="column-add" onClick={() => { setNewStatus(column.id); setShowModal(true); }}><Plus size={16} /> Add task</button></section>; })}</div> : <div className="empty-view"><div className="empty-icon"><LayoutGrid /></div><h2>{activeView} view is ready to shape</h2><p>Switch back to Board to see your tasks, or add a task to keep momentum moving.</p><button className="add-button" onClick={() => setShowModal(true)}><Plus size={17} /> Add task</button></div>}
          </> : activeSection === "inbox" ? <div className="section-view"><div className="section-heading"><div><div className="eyebrow"><Inbox size={13} /> YOUR INBOX</div><h1>Inbox <span className="private-pill">{activeTeam.inboxItems.length} unread</span></h1><p>Updates and conversations that need your attention.</p></div><button className="add-button" onClick={() => setActiveSection("projects")}><FolderKanban size={16} /> View projects</button></div><div className="inbox-list">{activeTeam.inboxItems.length === 0 ? <p className="empty-state">No notifications yet for this team.</p> : activeTeam.inboxItems.map((item) => <article className="inbox-item" key={item.title}><div className={`avatar avatar-${item.color}`}>{item.initials}</div><div className="inbox-copy"><h3>{item.title}</h3><p>{item.detail}</p></div><time>{item.time}</time><button className="inbox-check" aria-label={`Mark ${item.title} as read`}><Check size={16} /></button></article>)}</div></div> : <div className="section-view"><div className="section-heading"><div><div className="eyebrow"><Users size={13} /> {activeTeam.name.toUpperCase()}</div><h1>People</h1><p>Everyone working in the {activeTeam.name}.</p></div><button className="add-button"><Plus size={17} /> Invite people</button></div><div className="people-grid">{activeTeam.people.map((person) => <article className="person-card" key={person.name}><div className={`avatar avatar-${person.color} person-avatar`}>{person.initials}</div><h3>{person.name}</h3><p>{person.role}</p><span>{activeTeam.projects.join(", ")}</span><button className="person-action" onClick={() => setViewingPerson(person)}>View profile</button></article>)}</div></div>}
        </div>
      </section>

      {showNewTeamModal && <div className="modal-backdrop" onMouseDown={() => setShowNewTeamModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEW TEAM</span><h2>Create a product team</h2></div><button className="close-button" onClick={() => setShowNewTeamModal(false)} aria-label="Close"><X size={18} /></button></div><label>Team name<input autoFocus value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="e.g. Marketing team" /></label><label>Projects <small>(comma separated)</small><input value={newTeamProjects} onChange={(event) => setNewTeamProjects(event.target.value)} placeholder="e.g. Campaign site, Brand assets" /></label><label>People <small>(comma separated names)</small><input value={newTeamPeople} onChange={(event) => setNewTeamPeople(event.target.value)} placeholder="e.g. Alex Chen, Priya Sharma" /></label><div className="modal-actions"><button className="cancel-button" onClick={() => setShowNewTeamModal(false)}>Cancel</button><button className="add-button" onClick={createTeam}><Plus size={17} /> Create team</button></div></div></div>}

      {showModal && <div className="modal-backdrop" onMouseDown={() => setShowModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEW TASK</span><h2>Add to the project</h2></div><button className="close-button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button></div><label>Task name<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} placeholder="e.g. Sketch the new homepage" /></label><div className="modal-fields"><label>Status<select value={newStatus} onChange={(event) => setNewStatus(event.target.value as Status)}>{columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label><label>Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select></label></div><div className="modal-actions"><button className="cancel-button" onClick={() => setShowModal(false)}>Cancel</button><button className="add-button" onClick={addTask}><Plus size={17} /> Create task</button></div></div></div>}

      {showShareModal && <div className="modal-backdrop" onMouseDown={() => setShowShareModal(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">SHARE PROJECT</span><h2>{selectedProject}</h2></div><button className="close-button" onClick={() => setShowShareModal(false)} aria-label="Close"><X size={18} /></button></div><label>Invite by link<div className="share-link-row"><input readOnly value={`https://northstar.app/projects/${encodeURIComponent(selectedProject)}`} /><button className="add-button" onClick={copyProjectLink}>{linkCopied ? "Copied!" : "Copy link"}</button></div></label><div className="share-people">{activeTeam.people.map((person) => <div className="share-person-row" key={person.name}><div className={`avatar avatar-${person.color}`}>{person.initials}</div><div><strong>{person.name}</strong><small>{person.role}</small></div><span className="share-access">Can edit</span></div>)}</div><div className="modal-actions"><button className="cancel-button" onClick={() => setShowShareModal(false)}>Done</button></div></div></div>}

      {infoModal && <div className="modal-backdrop" onMouseDown={() => setInfoModal(null)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">{infoModal === "about" ? "ABOUT NORTHSTAR" : "CONTACT US"}</span><h2>{infoModal === "about" ? "About Northstar" : "Get in touch"}</h2></div><button className="close-button" onClick={() => setInfoModal(null)} aria-label="Close"><X size={18} /></button></div>{infoModal === "about" ? <div className="profile-modal-body"><div><strong>Northstar keeps teams aligned on projects, tasks, and people.</strong><p>Use the board, inbox, and people views to stay on top of your work in one place.</p></div></div> : <div className="profile-modal-body"><div><strong>Need help from the Northstar team?</strong><p>Email support@northstar.app and include your workspace name so we can follow up quickly.</p></div></div>}<div className="modal-actions"><button className="cancel-button" onClick={() => setInfoModal(null)}>Close</button></div></div></div>}

      {viewingPerson && <div className="modal-backdrop" onMouseDown={() => setViewingPerson(null)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">TEAM MEMBER</span><h2>{viewingPerson.name}</h2></div><button className="close-button" onClick={() => setViewingPerson(null)} aria-label="Close"><X size={18} /></button></div><div className="profile-modal-body"><div className={`avatar avatar-${viewingPerson.color} person-avatar`}>{viewingPerson.initials}</div><div><strong>{viewingPerson.role}</strong><p>Projects: {activeTeam.projects.join(", ")}</p></div></div><div className="modal-actions"><button className="cancel-button" onClick={() => setViewingPerson(null)}>Close</button></div></div></div>}
    </main>
  );
}
