-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'planner', 'purchaser', 'installer', 'marketer', 'auditor', 'agent', 'voice_operator');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'invited', 'disabled');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('private', 'b2b');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('lead', 'planning', 'quoted', 'won', 'in_execution', 'delivered', 'completed', 'lost', 'on_hold');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('cabinets', 'appliances', 'countertops', 'sinks', 'accessories', 'service', 'other');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'sent', 'confirmed', 'partially_confirmed', 'delivered', 'partially_delivered', 'invoiced', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "AbStatus" AS ENUM ('received', 'parsed', 'matched', 'deviating', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "Ampel" AS ENUM ('green', 'yellow', 'red');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('missing_position', 'wrong_qty', 'price_delta', 'date_delta', 'unexpected_position', 'ambiguous');

-- CreateEnum
CREATE TYPE "DiscrepancyState" AS ENUM ('open', 'in_progress', 'waiting_supplier', 'resolved', 'wontfix');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('quote', 'order', 'ab', 'invoice', 'delivery_note', 'installation_sheet', 'photo', 'contract', 'note', 'other');

-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('upload', 'email', 'agent', 'scan');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "EmailClassification" AS ENUM ('ab', 'quote', 'invoice', 'delivery_date', 'complaint', 'customer_request', 'promo', 'unknown');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('new', 'triaged', 'assigned', 'answered', 'archived');

-- CreateEnum
CREATE TYPE "MailboxState" AS ENUM ('active', 'disabled', 'error');

-- CreateEnum
CREATE TYPE "BoardObjectKind" AS ENUM ('generic', 'project', 'order', 'order_confirmation', 'discrepancy', 'email', 'appointment', 'complaint', 'social_post', 'voice_session');

-- CreateEnum
CREATE TYPE "CardPriority" AS ENUM ('low', 'med', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('open', 'blocked', 'in_progress', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('open', 'in_progress', 'blocked', 'done');

-- CreateEnum
CREATE TYPE "AppointmentKind" AS ENUM ('consultation', 'measurement', 'delivery', 'installation', 'rework', 'complaint_visit', 'internal');

-- CreateEnum
CREATE TYPE "AppointmentState" AS ENUM ('proposed', 'confirmed', 'moved', 'cancelled', 'done');

-- CreateEnum
CREATE TYPE "SocialChannel" AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'web');

-- CreateEnum
CREATE TYPE "SocialState" AS ENUM ('idea', 'draft', 'review', 'approved', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "AgentKey" AS ENUM ('mail', 'ab', 'kundenakte', 'termin', 'controlling', 'social', 'speech', 'orchestrator');

-- CreateEnum
CREATE TYPE "AgentRunState" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "SpeechMode" AS ENUM ('push_to_talk', 'continuous', 'dictation');

-- CreateEnum
CREATE TYPE "SttJobState" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "TtsJobState" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "SpeechIntent" AS ENUM ('open_board', 'find_email', 'create_appointment', 'read_discrepancies', 'draft_social_post', 'summarize_project', 'unknown');

-- CreateEnum
CREATE TYPE "SpeechCommandState" AS ENUM ('new', 'routed', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "VoiceProfileState" AS ENUM ('draft', 'pending_consent', 'active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "VoicePurpose" AS ENUM ('self_tts', 'character_voice', 'experiment');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "scope" JSONB,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorAgentRunId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashPrev" TEXT,
    "hashSelf" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'private',
    "salutation" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "notes" TEXT,
    "consent" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL DEFAULT 'lead',
    "budget" DECIMAL(14,2),
    "plannerUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'other',
    "contact" JSONB,
    "deliveryTerms" TEXT,
    "notes" TEXT,
    "reliabilityScore" DECIMAL(5,2),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "orderedAt" TIMESTAMP(3),
    "expectedDeliveryAt" TIMESTAMP(3),
    "totalNet" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit" TEXT,
    "unitPriceNet" DECIMAL(14,4),
    "requestedDeliveryAt" TIMESTAMP(3),
    "attributes" JSONB,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderConfirmation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderId" TEXT,
    "emailId" TEXT,
    "documentId" TEXT,
    "abNumber" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "status" "AbStatus" NOT NULL DEFAULT 'received',
    "parsedPayload" JSONB,
    "ampel" "Ampel" DEFAULT 'green',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderConfirmationItem" (
    "id" TEXT NOT NULL,
    "orderConfirmationId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit" TEXT,
    "unitPriceNet" DECIMAL(14,4),
    "confirmedDeliveryAt" TIMESTAMP(3),
    "attributes" JSONB,

    CONSTRAINT "OrderConfirmationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscrepancyCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderConfirmationId" TEXT NOT NULL,
    "type" "DiscrepancyType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "state" "DiscrepancyState" NOT NULL DEFAULT 'open',
    "assigneeUserId" TEXT,
    "diff" JSONB NOT NULL,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscrepancyCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "kind" "DocumentKind" NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentDocumentId" TEXT,
    "source" "DocumentSource" NOT NULL DEFAULT 'upload',
    "classificationConfidence" DECIMAL(5,4),
    "toReview" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'imap',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "folders" JSONB,
    "state" "MailboxState" NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "inReplyTo" TEXT,
    "direction" "EmailDirection" NOT NULL DEFAULT 'in',
    "fromAddr" TEXT NOT NULL,
    "toAddrs" TEXT[],
    "ccAddrs" TEXT[],
    "bccAddrs" TEXT[],
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "classification" "EmailClassification" NOT NULL DEFAULT 'unknown',
    "classificationConfidence" DECIMAL(5,4),
    "projectId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'new',
    "rawHeaders" JSONB,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "bodyRedacted" TEXT,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "documentId" TEXT,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "actorUserId" TEXT,
    "actorAgentRunId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'tenant',
    "ownerUserId" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardList" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "wipLimit" INTEGER,
    "rules" JSONB,

    CONSTRAINT "BoardList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardCard" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "priority" "CardPriority" NOT NULL DEFAULT 'med',
    "dueAt" TIMESTAMP(3),
    "assigneeUserId" TEXT,
    "watchers" TEXT[],
    "labels" TEXT[],
    "status" "CardStatus" NOT NULL DEFAULT 'open',
    "objectKind" "BoardObjectKind" NOT NULL DEFAULT 'generic',
    "objectId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardCardEvent" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "actorId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardCardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentKind" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "state" "TaskState" NOT NULL DEFAULT 'open',
    "priority" "CardPriority" NOT NULL DEFAULT 'med',
    "notes" TEXT,
    "cardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "customerId" TEXT,
    "kind" "AppointmentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" JSONB,
    "participants" JSONB,
    "state" "AppointmentState" NOT NULL DEFAULT 'confirmed',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalCalendarRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceEmailId" TEXT NOT NULL,
    "proposed" JSONB NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'new',
    "acceptedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "channel" "SocialChannel" NOT NULL,
    "contentText" TEXT NOT NULL,
    "mediaRefs" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "state" "SocialState" NOT NULL DEFAULT 'idea',
    "approvals" JSONB,
    "metrics" JSONB,
    "createdByAgentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitabilityMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revenueNet" DECIMAL(14,2) NOT NULL,
    "costGoods" DECIMAL(14,2) NOT NULL,
    "costLabor" DECIMAL(14,2) NOT NULL,
    "costOther" DECIMAL(14,2) NOT NULL,
    "marginNet" DECIMAL(14,2) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceRunId" TEXT,

    CONSTRAINT "ProfitabilityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDaily" (
    "date" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "dims" JSONB,

    CONSTRAINT "MetricDaily_pkey" PRIMARY KEY ("date","tenantId","key")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" "AgentKey" NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentKey" "AgentKey" NOT NULL,
    "agentDbId" TEXT,
    "trigger" TEXT NOT NULL,
    "triggerRef" TEXT,
    "input" JSONB,
    "output" JSONB,
    "state" "AgentRunState" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" JSONB,
    "parentRunId" TEXT,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "consentDocumentId" TEXT,
    "consentSignedAt" TIMESTAMP(3),
    "samplesStorageKeys" TEXT[],
    "embeddingKey" TEXT,
    "state" "VoiceProfileState" NOT NULL DEFAULT 'draft',
    "purpose" "VoicePurpose" NOT NULL DEFAULT 'self_tts',
    "watermarking" BOOLEAN NOT NULL DEFAULT true,
    "kmsKeyId" TEXT,
    "createdBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeechSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "mode" "SpeechMode" NOT NULL DEFAULT 'push_to_talk',
    "locale" TEXT NOT NULL DEFAULT 'de-DE',
    "deviceInfo" JSONB,
    "consentSnapshot" JSONB,

    CONSTRAINT "SpeechSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SttJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "audioStorageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "durationMs" INTEGER,
    "model" TEXT,
    "language" TEXT,
    "state" "SttJobState" NOT NULL DEFAULT 'queued',
    "partialsCount" INTEGER NOT NULL DEFAULT 0,
    "finalText" TEXT,
    "finalConfidence" DECIMAL(5,4),
    "costMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SttJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sttJobId" TEXT,
    "text" TEXT NOT NULL,
    "segments" JSONB,
    "speakerLabels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "text" TEXT NOT NULL,
    "voiceProfileId" TEXT,
    "model" TEXT,
    "audioStorageKey" TEXT,
    "mime" TEXT,
    "durationMs" INTEGER,
    "state" "TtsJobState" NOT NULL DEFAULT 'queued',
    "options" JSONB,
    "costMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TtsJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeechCommand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceTranscriptId" TEXT,
    "intent" "SpeechIntent" NOT NULL,
    "params" JSONB,
    "dispatchedRunId" TEXT,
    "state" "SpeechCommandState" NOT NULL DEFAULT 'new',
    "confidence" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeechCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_lastName_idx" ON "Customer"("tenantId", "lastName");

-- CreateIndex
CREATE INDEX "Customer_tenantId_company_idx" ON "Customer"("tenantId", "company");

-- CreateIndex
CREATE INDEX "Project_tenantId_stage_idx" ON "Project"("tenantId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_code_key" ON "Project"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Order_projectId_idx" ON "Order"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_positionNo_key" ON "OrderItem"("orderId", "positionNo");

-- CreateIndex
CREATE INDEX "OrderConfirmation_tenantId_status_idx" ON "OrderConfirmation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OrderConfirmation_orderId_idx" ON "OrderConfirmation"("orderId");

-- CreateIndex
CREATE INDEX "OrderConfirmation_supplierId_idx" ON "OrderConfirmation"("supplierId");

-- CreateIndex
CREATE INDEX "DiscrepancyCase_tenantId_state_idx" ON "DiscrepancyCase"("tenantId", "state");

-- CreateIndex
CREATE INDEX "DiscrepancyCase_orderConfirmationId_idx" ON "DiscrepancyCase"("orderConfirmationId");

-- CreateIndex
CREATE INDEX "Document_tenantId_kind_idx" ON "Document"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_customerId_idx" ON "Document"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_tenantId_address_key" ON "Mailbox"("tenantId", "address");

-- CreateIndex
CREATE INDEX "Email_tenantId_classification_receivedAt_idx" ON "Email"("tenantId", "classification", "receivedAt");

-- CreateIndex
CREATE INDEX "Email_projectId_idx" ON "Email"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_tenantId_mailboxId_messageId_key" ON "Email"("tenantId", "mailboxId", "messageId");

-- CreateIndex
CREATE INDEX "EmailEvent_emailId_at_idx" ON "EmailEvent"("emailId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Board_tenantId_key_key" ON "Board"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BoardList_boardId_orderIndex_key" ON "BoardList"("boardId", "orderIndex");

-- CreateIndex
CREATE INDEX "BoardCard_boardId_listId_orderIndex_idx" ON "BoardCard"("boardId", "listId", "orderIndex");

-- CreateIndex
CREATE INDEX "BoardCard_objectKind_objectId_idx" ON "BoardCard"("objectKind", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "board_card_object_unique" ON "BoardCard"("boardId", "objectKind", "objectId");

-- CreateIndex
CREATE INDEX "BoardCardEvent_cardId_at_idx" ON "BoardCardEvent"("cardId", "at");

-- CreateIndex
CREATE INDEX "Task_tenantId_state_idx" ON "Task"("tenantId", "state");

-- CreateIndex
CREATE INDEX "Task_parentKind_parentId_idx" ON "Task"("parentKind", "parentId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_startAt_idx" ON "Appointment"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_projectId_idx" ON "Appointment"("projectId");

-- CreateIndex
CREATE INDEX "AppointmentSuggestion_tenantId_state_idx" ON "AppointmentSuggestion"("tenantId", "state");

-- CreateIndex
CREATE INDEX "SocialPost_tenantId_state_idx" ON "SocialPost"("tenantId", "state");

-- CreateIndex
CREATE INDEX "ProfitabilityMetric_tenantId_projectId_idx" ON "ProfitabilityMetric"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "MetricDaily_tenantId_key_date_idx" ON "MetricDaily"("tenantId", "key", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_tenantId_key_version_key" ON "Agent"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "AgentRun_tenantId_agentKey_state_idx" ON "AgentRun"("tenantId", "agentKey", "state");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRun_tenantId_idempotencyKey_key" ON "AgentRun"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentEvent_runId_at_idx" ON "AgentEvent"("runId", "at");

-- CreateIndex
CREATE INDEX "VoiceProfile_tenantId_state_idx" ON "VoiceProfile"("tenantId", "state");

-- CreateIndex
CREATE INDEX "SpeechSession_tenantId_startedAt_idx" ON "SpeechSession"("tenantId", "startedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConfirmationItem" ADD CONSTRAINT "OrderConfirmationItem_orderConfirmationId_fkey" FOREIGN KEY ("orderConfirmationId") REFERENCES "OrderConfirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepancyCase" ADD CONSTRAINT "DiscrepancyCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepancyCase" ADD CONSTRAINT "DiscrepancyCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepancyCase" ADD CONSTRAINT "DiscrepancyCase_orderConfirmationId_fkey" FOREIGN KEY ("orderConfirmationId") REFERENCES "OrderConfirmation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardList" ADD CONSTRAINT "BoardList_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCard" ADD CONSTRAINT "BoardCard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCard" ADD CONSTRAINT "BoardCard_listId_fkey" FOREIGN KEY ("listId") REFERENCES "BoardList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCardEvent" ADD CONSTRAINT "BoardCardEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BoardCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BoardCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityMetric" ADD CONSTRAINT "ProfitabilityMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentDbId_fkey" FOREIGN KEY ("agentDbId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_consentDocumentId_fkey" FOREIGN KEY ("consentDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SttJob" ADD CONSTRAINT "SttJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeechSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeechSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_sttJobId_fkey" FOREIGN KEY ("sttJobId") REFERENCES "SttJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TtsJob" ADD CONSTRAINT "TtsJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeechSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeechCommand" ADD CONSTRAINT "SpeechCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeechSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
