-- CreateTable
CREATE TABLE `admission_inquiries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_name` VARCHAR(150) NOT NULL,
    `guardian_name` VARCHAR(150) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `grade_applying_for` VARCHAR(50) NOT NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('NEW', 'CONTACTED', 'UNDER_REVIEW', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `admission_inquiries_status_idx`(`status`),
    INDEX `admission_inquiries_email_idx`(`email`),
    INDEX `admission_inquiries_phone_idx`(`phone`),
    INDEX `admission_inquiries_grade_applying_for_idx`(`grade_applying_for`),
    INDEX `admission_inquiries_academic_year_idx`(`academic_year`),
    INDEX `admission_inquiries_created_at_idx`(`created_at`),
    INDEX `admission_inquiries_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
