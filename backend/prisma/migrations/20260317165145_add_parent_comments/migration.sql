-- CreateTable
CREATE TABLE "parent_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parent_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parent_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parent_comments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
