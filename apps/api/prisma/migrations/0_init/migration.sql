-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "global_role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_teachers" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "competition_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    "submit_deadline" TIMESTAMPTZ(6) NOT NULL,
    "rubric_version" VARCHAR(50) NOT NULL,
    "peer_review_enabled" BOOLEAN NOT NULL DEFAULT true,
    "dashboard_published" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "project_name" VARCHAR(100) NOT NULL,
    "project_description" TEXT,
    "report_url" TEXT,
    "prototype_url" TEXT,
    "video_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "access_status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_submissions" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSON NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocked_by" UUID,
    "unlock_reason" TEXT,

    CONSTRAINT "team_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "evidence_id" VARCHAR(50) NOT NULL,
    "competition_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "dimension" VARCHAR(40) NOT NULL,
    "material_type" VARCHAR(30) NOT NULL,
    "locator" JSON NOT NULL,
    "extracted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "score_version" VARCHAR(20) NOT NULL,
    "rubric_version" VARCHAR(50) NOT NULL,
    "input_version" VARCHAR(80) NOT NULL,
    "final_score" DECIMAL(5,1),
    "peer_review_score" DECIMAL(3,1),
    "status" VARCHAR(20) NOT NULL DEFAULT 'agent_scored',
    "risk_flags" JSON NOT NULL DEFAULT '[]',
    "model_version" VARCHAR(50),
    "prompt_version" VARCHAR(20),
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_dimensions" (
    "id" UUID NOT NULL,
    "score_id" UUID NOT NULL,
    "dimension_key" VARCHAR(40) NOT NULL,
    "agent_score" INTEGER,
    "agent_confidence" DECIMAL(3,2),
    "agent_evidence" JSON NOT NULL DEFAULT '[]',
    "sub_scores" JSON,
    "highlight" TEXT,
    "suggestion" TEXT,
    "teacher_score" INTEGER,
    "teacher_action" VARCHAR(20),
    "teacher_reason" TEXT,
    "composite_score" DECIMAL(5,2),

    CONSTRAINT "score_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "dimension_key" VARCHAR(40) NOT NULL,
    "score_version" VARCHAR(20) NOT NULL,
    "highlight" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "tags" JSON NOT NULL DEFAULT '[]',
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'captain',
    "source" VARCHAR(20) NOT NULL DEFAULT 'agent',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_review_mappings" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "algorithm_version" VARCHAR(20) NOT NULL,
    "mapping" JSON NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_review_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_reviews" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "mapping_id" UUID NOT NULL,
    "reviewer_team_id" UUID NOT NULL,
    "target_team_id" UUID NOT NULL,
    "score" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "anomaly_reasons" JSON NOT NULL DEFAULT '[]',
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_outbox" (
    "id" UUID NOT NULL,
    "message_id" VARCHAR(64) NOT NULL,
    "competition_id" UUID NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "entity_id" UUID,
    "entity_version" INTEGER,
    "actor_id" UUID,
    "payload" JSON NOT NULL DEFAULT '{}',
    "server_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ack_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" UUID NOT NULL,
    "rubric_version" VARCHAR(50) NOT NULL,
    "definition" JSON NOT NULL,
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "competition_teachers_competition_id_user_id_key" ON "competition_teachers"("competition_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_competition_id_name_key" ON "teams"("competition_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_submissions_team_id_version_key" ON "team_submissions"("team_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_evidence_id_key" ON "evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_team_id_score_version_key" ON "scores"("team_id", "score_version");

-- CreateIndex
CREATE UNIQUE INDEX "score_dimensions_score_id_dimension_key_key" ON "score_dimensions"("score_id", "dimension_key");

-- CreateIndex
CREATE UNIQUE INDEX "peer_reviews_mapping_id_reviewer_team_id_key" ON "peer_reviews"("mapping_id", "reviewer_team_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_outbox_message_id_key" ON "event_outbox"("message_id");

-- CreateIndex
CREATE INDEX "event_outbox_server_time_idx" ON "event_outbox"("server_time");

-- CreateIndex
CREATE UNIQUE INDEX "rubrics_rubric_version_key" ON "rubrics"("rubric_version");

-- AddForeignKey
ALTER TABLE "competition_teachers" ADD CONSTRAINT "competition_teachers_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_teachers" ADD CONSTRAINT "competition_teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_submissions" ADD CONSTRAINT "team_submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_dimensions" ADD CONSTRAINT "score_dimensions_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_review_mappings" ADD CONSTRAINT "peer_review_mappings_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "peer_review_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_reviewer_team_id_fkey" FOREIGN KEY ("reviewer_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_target_team_id_fkey" FOREIGN KEY ("target_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

