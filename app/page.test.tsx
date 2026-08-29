// @ts-nocheck
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Page from "./page";

describe("Home page - initial render", () => {
  test("renders default team, project, and board view", () => {
    render(<Page />);
    expect(screen.getByText("Product team", { selector: "small" })).toBeInTheDocument();
    expect(screen.getByText("Website refresh", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  test("renders seeded tasks in correct columns", () => {
    render(<Page />);
    expect(screen.getByText("Map the onboarding journey")).toBeInTheDocument();
    expect(screen.queryByText("Publish v2.4 release notes")).not.toBeInTheDocument();
  });
  
  test("opens a separate Kanban board when a different project is selected", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Mobile app", { selector: ".project-row > button" }));
    expect(screen.getByText("Refine notification rules")).toBeInTheDocument();
    expect(screen.queryByText("Map the onboarding journey")).not.toBeInTheDocument();
  });

  test("shows the actual task total beside each project", () => {
    render(<Page />);
    expect(screen.getByText("Mobile app", { selector: ".project-row > button" })).toHaveTextContent("Mobile app3");
  });
});

describe("Navigation between sections", () => {
  test("switches to Inbox section and shows unread count", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Inbox/i }));
    expect(screen.getByText(/unread/i)).toBeInTheDocument();
    expect(screen.getByText(/Mina mentioned you in Website refresh/i)).toBeInTheDocument();
  });

  test("switches to People section and lists team members", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^People$/i }));
    expect(screen.getByText("Mina Patel", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Owen Brooks", { selector: "h3" })).toBeInTheDocument();
  });

  test("switches back to Projects section from Inbox", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Inbox/i }));
    fireEvent.click(screen.getByRole("button", { name: /View projects/i }));
    expect(screen.getByText("Board")).toBeInTheDocument();
  });
});

describe("Task creation (Add task modal)", () => {
  test("opens a card, supports owned comments, and does not offer edits for other authors", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Map the onboarding journey"));
    expect(screen.getByRole("dialog", { name: "Map the onboarding journey" })).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Add a comment"), { target: { value: "I will handle the interview notes." } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("I will handle the interview notes."), { target: { value: "Interview notes are underway." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Interview notes are underway.")).toBeInTheDocument();
  });

  test("deletes a task through its card options menu", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Options for Map the onboarding journey"));
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    expect(screen.queryByText("Map the onboarding journey")).not.toBeInTheDocument();
  });

  test("closes a card options menu when clicking outside it", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Options for Map the onboarding journey"));
    expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
    fireEvent.click(document.querySelector(".task-menu-backdrop")!);
    expect(screen.queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
  });

  test("shows and manages multiple assignees from the card avatar control", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("View assignees for Map the onboarding journey"));
    const assigneeCheckboxes = screen.getAllByRole("checkbox");
    expect(assigneeCheckboxes[0]).toBeChecked();
    expect(assigneeCheckboxes[1]).toBeChecked();
    fireEvent.click(assigneeCheckboxes[2]);
    expect(assigneeCheckboxes[2]).toBeChecked();
    fireEvent.click(assigneeCheckboxes[3]);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByLabelText("View assignees for Map the onboarding journey")).toHaveTextContent("+1");
  });

  test("saves issue edits only after Save and discards them with the X control", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Map the onboarding journey"));
    fireEvent.click(screen.getByRole("button", { name: "Edit issue" }));
    fireEvent.change(screen.getByLabelText("Issue title"), { target: { value: "Discarded title" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard issue changes" }));
    expect(screen.getByRole("dialog", { name: "Map the onboarding journey" })).toHaveTextContent("Map the onboarding journey");
    fireEvent.click(screen.getByRole("button", { name: "Edit issue" }));
    fireEvent.change(screen.getByLabelText("Issue title"), { target: { value: "Saved title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("dialog", { name: "Saved title" })).toHaveTextContent("Saved title");
  });

  test("adds a new task to Backlog via the top toolbar", () => {
    render(<Page />);
    // "Add task" appears more than once (toolbar + per-column buttons);
    // the toolbar button is the first one rendered.
    fireEvent.click(screen.getAllByText("Add task")[0]);
    const input = screen.getByPlaceholderText(/Sketch the new homepage/i);
    fireEvent.change(input, { target: { value: "Write test coverage" } });
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));
    expect(screen.getByText("Write test coverage")).toBeInTheDocument();
  });

  test("does not add a task when title is empty (fail case)", () => {
    render(<Page />);
    fireEvent.click(screen.getAllByText("Add task")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));
    // Modal should remain open since no task was created
    expect(screen.getByText("Add to the project")).toBeInTheDocument();
  });

  test("cancel button closes modal without adding task", () => {
    render(<Page />);
    fireEvent.click(screen.getAllByText("Add task")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByText("Add to the project")).not.toBeInTheDocument();
  });

  test("adding a task from a column preselects that column's status", () => {
    render(<Page />);
    const addTaskButtons = screen.getAllByText("Add task");
    fireEvent.click(addTaskButtons[addTaskButtons.length - 1]);
    const select = screen.getByDisplayValue("Done");
    expect(select).toBeInTheDocument();
  });
});

describe("Search / filter tasks", () => {
  test("filters tasks by title text", () => {
    render(<Page />);
    const searchInput = screen.getByPlaceholderText("Search tasks");
    fireEvent.change(searchInput, { target: { value: "onboarding" } });
    expect(screen.getByText("Map the onboarding journey")).toBeInTheDocument();
    expect(screen.queryByText("Audit empty states")).not.toBeInTheDocument();
  });

  test("shows no tasks for a query that matches nothing (edge case)", () => {
    render(<Page />);
    const searchInput = screen.getByPlaceholderText("Search tasks");
    fireEvent.change(searchInput, { target: { value: "zzzznotfound" } });
    expect(screen.queryByText("Map the onboarding journey")).not.toBeInTheDocument();
  });

  test("search is case-insensitive", () => {
    render(<Page />);
    const searchInput = screen.getByPlaceholderText("Search tasks");
    fireEvent.change(searchInput, { target: { value: "ONBOARDING" } });
    expect(screen.getByText("Map the onboarding journey")).toBeInTheDocument();
  });
});

describe("Project management", () => {
  test("adding a new project creates a uniquely named project and enters rename mode", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Add project"));
    const renameInput = screen.getByDisplayValue("New project");
    expect(renameInput).toBeInTheDocument();
  });

  test("renaming a project to an empty string cancels the rename (fail case)", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Add project"));
    const renameInput = screen.getByDisplayValue("New project");
    fireEvent.change(renameInput, { target: { value: "   " } });
    fireEvent.blur(renameInput);
    expect(screen.queryByDisplayValue("   ")).not.toBeInTheDocument();
  });

  test("adding a duplicate project name auto-increments suffix (edge case)", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Add project"));
    fireEvent.blur(screen.getByDisplayValue("New project")); // commit "New project"
    fireEvent.click(screen.getByLabelText("Add project"));
    expect(screen.getByDisplayValue("New project 2")).toBeInTheDocument();
  });

  test("renames a project from its options menu", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Options for Website refresh"));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const renameInput = screen.getByDisplayValue("Website refresh");
    fireEvent.change(renameInput, { target: { value: "Marketing site" } });
    fireEvent.blur(renameInput);
    expect(screen.getByText("Marketing site", { selector: ".project-row button" })).toBeInTheDocument();
  });

  test("deletes a project from its options menu", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Options for Website refresh"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Website refresh", { selector: ".project-row button" })).not.toBeInTheDocument();
    expect(screen.getByText("Mobile app", { selector: "strong" })).toBeInTheDocument();
  });
});

describe("Team creation modal", () => {
  test("creates a new team with parsed comma-separated projects and people", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Northstar/i }));
    fireEvent.click(screen.getByText("New team"));
    fireEvent.change(screen.getByPlaceholderText(/Marketing team/i), { target: { value: "Design team" } });
    fireEvent.change(screen.getByPlaceholderText(/Campaign site/i), { target: { value: "Landing page, Style guide" } });
    fireEvent.change(screen.getByPlaceholderText(/Alex Chen/i), { target: { value: "Sam Lee" } });
    fireEvent.click(screen.getByText("Create team"));
    expect(screen.getByText("Design team", { selector: "small" })).toBeInTheDocument();
    expect(screen.getByText("Landing page", { selector: "strong" })).toBeInTheDocument();
  });

  test("does not create a team with empty/whitespace name (fail case)", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Northstar/i }));
    fireEvent.click(screen.getByText("New team"));
    fireEvent.click(screen.getByText("Create team"));
    expect(screen.getByText("Create a product team")).toBeInTheDocument();
  });

  test("new team defaults to 'New project' when no projects are provided (edge case)", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Northstar/i }));
    fireEvent.click(screen.getByText("New team"));
    fireEvent.change(screen.getByPlaceholderText(/Marketing team/i), { target: { value: "Ops team" } });
    fireEvent.click(screen.getByText("Create team"));
    expect(screen.getByText("New project", { selector: "strong" })).toBeInTheDocument();
  });
});

describe("Share modal", () => {
  test("opens share modal and displays the project link", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("Share"));
    expect(screen.getByDisplayValue(/northstar\.app\/projects\/Website%20refresh/i)).toBeInTheDocument();
  });

  test("copy link button updates to 'Copied!' after click", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    render(<Page />);
    fireEvent.click(screen.getByText("Share"));
    fireEvent.click(screen.getByText("Copy link"));
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });
});

describe("Person profile modal", () => {
  test("opens the invitation dialog and validates the recipient email", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^People$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Invite people/i }));
    expect(screen.getByRole("dialog", { name: "Invite a teammate" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Send invitation/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  test("viewing a person from People section shows their role and projects", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^People$/i }));
    fireEvent.click(screen.getAllByText("View profile")[0]);
    expect(screen.getByText("Product lead", { selector: "strong" })).toBeInTheDocument();
  });

  test("closing profile modal removes it from the DOM", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^People$/i }));
    fireEvent.click(screen.getAllByText("View profile")[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Close/i })[0]);
    expect(screen.queryByText("TEAM MEMBER")).not.toBeInTheDocument();
  });
});

describe("Notifications panel", () => {
  test("toggles notification panel visibility", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  test("'View all in inbox' navigates to Inbox section and closes panel", () => {
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByText("View all in inbox"));
    expect(screen.getByText(/unread/i)).toBeInTheDocument();
  });
});

describe("Sidebar about and contact actions", () => {
  test("opens profile settings with a permanent name and editable properties", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Mina Patel Admin/i }));
    expect(screen.getByRole("dialog", { name: "Profile settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByDisplayValue("mina.patel@northstar.app"), { target: { value: "mina@company.com" } });
    fireEvent.change(screen.getByDisplayValue("Admin"), { target: { value: "Project manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("button", { name: /Mina Patel Project manager/i })).toBeInTheDocument();
  });

  test("clicking About opens the Northstar info modal", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^About$/i }));
    expect(screen.getByRole("dialog", { name: "About Northstar" })).toBeInTheDocument();
    expect(screen.getByText("About Northstar")).toBeInTheDocument();
    expect(screen.getByText(/keeps teams aligned on projects, tasks, and people/i)).toBeInTheDocument();
  });

  test("clicking Contact us opens contact details", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^Contact us$/i }));
    expect(screen.getByRole("dialog", { name: "Get in touch" })).toBeInTheDocument();
    expect(screen.getByText("Get in touch")).toBeInTheDocument();
    expect(screen.getByText(/support@northstar\.app/i)).toBeInTheDocument();
  });
});

describe("View switching (Board/List/Timeline)", () => {
  test("switching to List view shows project tasks and opens their issue details", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^List$/i }));
    expect(screen.getByText("Task")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Map the onboarding journey", { selector: ".list-row strong" }));
    expect(screen.getByRole("dialog", { name: "Map the onboarding journey" })).toBeInTheDocument();
  });

  test("switching to Timeline view shows chronological task entries", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^Timeline$/i }));
    expect(screen.getByText("Jun 14", { selector: ".timeline-item time" })).toBeInTheDocument();
    expect(screen.getByText("Map the onboarding journey", { selector: ".timeline-item strong" })).toBeInTheDocument();
  });
});