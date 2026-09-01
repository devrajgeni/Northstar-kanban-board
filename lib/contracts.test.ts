import { createTaskSchema, moveTaskSchema, updateTaskSchema, workspaceRoleSchema } from "./contracts";

const id = "3de55161-2d23-4b4f-b546-ebc0f6170d7a";

describe("normalized API contracts", () => {
  test("accepts a valid task creation request and supplies defaults", () => {
    expect(createTaskSchema.parse({ columnId: id, title: "Plan release" })).toEqual({
      columnId: id,
      title: "Plan release",
      description: "",
      priority: "medium",
      assigneeIds: [],
      labelIds: [],
    });
  });

  test("rejects invalid task mutations", () => {
    expect(createTaskSchema.safeParse({ columnId: "not-a-uuid", title: "" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(moveTaskSchema.safeParse({ columnId: id, position: "last", version: 1 }).success).toBe(false);
  });

  test("allows only defined workspace roles", () => {
    expect(workspaceRoleSchema.safeParse("owner").success).toBe(true);
    expect(workspaceRoleSchema.safeParse("guest").success).toBe(false);
  });
});