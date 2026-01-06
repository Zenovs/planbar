-- CreateTable
CREATE TABLE IF NOT EXISTS "ticket_assignees" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ticket_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subtask_assignees" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "subtask_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_assignees_ticketId_userId_key" ON "ticket_assignees"("ticketId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subtask_assignees_subTaskId_userId_key" ON "subtask_assignees"("subTaskId", "userId");

-- AddForeignKey
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtask_assignees" ADD CONSTRAINT "subtask_assignees_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "sub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtask_assignees" ADD CONSTRAINT "subtask_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single assignees to multi-assignees
INSERT INTO "ticket_assignees" ("id", "ticketId", "userId", "createdAt")
SELECT gen_random_uuid(), "id", "assignedToId", CURRENT_TIMESTAMP
FROM "tickets"
WHERE "assignedToId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "subtask_assignees" ("id", "subTaskId", "userId", "createdAt")
SELECT gen_random_uuid(), "id", "assigneeId", CURRENT_TIMESTAMP
FROM "sub_tasks"
WHERE "assigneeId" IS NOT NULL
ON CONFLICT DO NOTHING;
