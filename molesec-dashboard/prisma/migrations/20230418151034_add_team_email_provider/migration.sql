-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "start_date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "email_provider" TEXT NOT NULL DEFAULT 'Unknown';
