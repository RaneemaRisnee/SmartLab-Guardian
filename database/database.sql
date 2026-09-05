-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: smartlab_guardian
-- ------------------------------------------------------
-- Server version	26.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '514da26f-a81c-11f1-8b08-0a002700000f:1-80';

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerts` (
  `alert_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `computer_id` int DEFAULT NULL,
  `login_session_id` int DEFAULT NULL,
  `alert_type` varchar(50) NOT NULL,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `message` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('OPEN','RESOLVED','IGNORED') DEFAULT 'OPEN',
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`alert_id`),
  KEY `fk_alert_student` (`student_id`),
  KEY `fk_alert_computer` (`computer_id`),
  KEY `fk_alert_login` (`login_session_id`),
  CONSTRAINT `fk_alert_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`computer_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alert_login` FOREIGN KEY (`login_session_id`) REFERENCES `login_sessions` (`login_session_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alert_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alerts`
--

LOCK TABLES `alerts` WRITE;
/*!40000 ALTER TABLE `alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_usage`
--

DROP TABLE IF EXISTS `application_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_usage` (
  `usage_id` int NOT NULL AUTO_INCREMENT,
  `login_session_id` int NOT NULL,
  `application_name` varchar(150) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_seconds` int DEFAULT '0',
  PRIMARY KEY (`usage_id`),
  KEY `fk_app_login` (`login_session_id`),
  CONSTRAINT `fk_app_login` FOREIGN KEY (`login_session_id`) REFERENCES `login_sessions` (`login_session_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_usage`
--

LOCK TABLES `application_usage` WRITE;
/*!40000 ALTER TABLE `application_usage` DISABLE KEYS */;
/*!40000 ALTER TABLE `application_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `student_id` int NOT NULL,
  `login_session_id` int DEFAULT NULL,
  `status` enum('PRESENT','ABSENT','LATE','FLAGGED') NOT NULL,
  `marked_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uq_attendance` (`session_id`,`student_id`),
  KEY `fk_attendance_student` (`student_id`),
  KEY `fk_attendance_login` (`login_session_id`),
  CONSTRAINT `fk_attendance_login` FOREIGN KEY (`login_session_id`) REFERENCES `login_sessions` (`login_session_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_session` FOREIGN KEY (`session_id`) REFERENCES `lab_sessions` (`session_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `computers`
--

DROP TABLE IF EXISTS `computers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `computers` (
  `computer_id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `pc_number` varchar(50) NOT NULL,
  `hostname` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `mac_address` varchar(50) DEFAULT NULL,
  `status` enum('AVAILABLE','IN_USE','OFFLINE','MAINTENANCE') DEFAULT 'AVAILABLE',
  `last_seen` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`computer_id`),
  UNIQUE KEY `uq_lab_pc` (`lab_id`,`pc_number`),
  CONSTRAINT `fk_computer_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`lab_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `computers`
--

LOCK TABLES `computers` WRITE;
/*!40000 ALTER TABLE `computers` DISABLE KEYS */;
/*!40000 ALTER TABLE `computers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_assignments`
--

DROP TABLE IF EXISTS `exam_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_assignments` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `student_id` int NOT NULL,
  `computer_id` int NOT NULL,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('ASSIGNED','LOGGED_IN','COMPLETED','MISMATCH') DEFAULT 'ASSIGNED',
  `login_time` datetime DEFAULT NULL,
  `logout_time` datetime DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_exam_student` (`exam_id`,`student_id`),
  UNIQUE KEY `uq_exam_computer` (`exam_id`,`computer_id`),
  KEY `fk_assignment_student` (`student_id`),
  KEY `fk_assignment_computer` (`computer_id`),
  CONSTRAINT `fk_assignment_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`computer_id`),
  CONSTRAINT `fk_assignment_exam` FOREIGN KEY (`exam_id`) REFERENCES `exam_sessions` (`exam_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_assignments`
--

LOCK TABLES `exam_assignments` WRITE;
/*!40000 ALTER TABLE `exam_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `exam_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_sessions`
--

DROP TABLE IF EXISTS `exam_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_sessions` (
  `exam_id` int NOT NULL AUTO_INCREMENT,
  `exam_name` varchar(150) NOT NULL,
  `lab_id` int NOT NULL,
  `exam_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('SCHEDULED','ACTIVE','COMPLETED','CANCELLED') DEFAULT 'SCHEDULED',
  `created_by` int NOT NULL,
  PRIMARY KEY (`exam_id`),
  KEY `fk_exam_lab` (`lab_id`),
  KEY `fk_exam_creator` (`created_by`),
  CONSTRAINT `fk_exam_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_exam_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`lab_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_sessions`
--

LOCK TABLES `exam_sessions` WRITE;
/*!40000 ALTER TABLE `exam_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `exam_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hardware_devices`
--

DROP TABLE IF EXISTS `hardware_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hardware_devices` (
  `hardware_id` int NOT NULL AUTO_INCREMENT,
  `computer_id` int NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `hardware_identifier` varchar(150) DEFAULT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `device_condition` enum('GOOD','DAMAGED','NEEDS_REPAIR') DEFAULT 'GOOD',
  `status` enum('CONNECTED','REMOVED','MISSING') DEFAULT 'CONNECTED',
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`hardware_id`),
  KEY `fk_hardware_computer` (`computer_id`),
  CONSTRAINT `fk_hardware_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`computer_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hardware_devices`
--

LOCK TABLES `hardware_devices` WRITE;
/*!40000 ALTER TABLE `hardware_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `hardware_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hardware_removal_alerts`
--

DROP TABLE IF EXISTS `hardware_removal_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hardware_removal_alerts` (
  `removal_alert_id` int NOT NULL AUTO_INCREMENT,
  `hardware_id` int NOT NULL,
  `computer_id` int NOT NULL,
  `detected_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `previous_status` varchar(30) DEFAULT NULL,
  `current_status` varchar(30) DEFAULT NULL,
  `description` text,
  `status` enum('OPEN','RESOLVED','IGNORED') DEFAULT 'OPEN',
  PRIMARY KEY (`removal_alert_id`),
  KEY `fk_removal_hardware` (`hardware_id`),
  KEY `fk_removal_computer` (`computer_id`),
  CONSTRAINT `fk_removal_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`computer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_removal_hardware` FOREIGN KEY (`hardware_id`) REFERENCES `hardware_devices` (`hardware_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hardware_removal_alerts`
--

LOCK TABLES `hardware_removal_alerts` WRITE;
/*!40000 ALTER TABLE `hardware_removal_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `hardware_removal_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_sessions`
--

DROP TABLE IF EXISTS `lab_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `lecturer_id` int NOT NULL,
  `session_name` varchar(150) NOT NULL,
  `session_type` enum('LAB','PRACTICAL','EXAM') NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('SCHEDULED','ACTIVE','COMPLETED','CANCELLED') DEFAULT 'SCHEDULED',
  PRIMARY KEY (`session_id`),
  KEY `fk_session_lab` (`lab_id`),
  KEY `fk_session_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_session_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`lab_id`),
  CONSTRAINT `fk_session_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_sessions`
--

LOCK TABLES `lab_sessions` WRITE;
/*!40000 ALTER TABLE `lab_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `labs`
--

DROP TABLE IF EXISTS `labs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labs` (
  `lab_id` int NOT NULL AUTO_INCREMENT,
  `lab_name` varchar(100) NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `description` text,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  PRIMARY KEY (`lab_id`),
  UNIQUE KEY `lab_name` (`lab_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `labs`
--

LOCK TABLES `labs` WRITE;
/*!40000 ALTER TABLE `labs` DISABLE KEYS */;
/*!40000 ALTER TABLE `labs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_sessions`
--

DROP TABLE IF EXISTS `login_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_sessions` (
  `login_session_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int DEFAULT NULL,
  `student_id` int NOT NULL,
  `computer_id` int NOT NULL,
  `login_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `logout_time` datetime DEFAULT NULL,
  `active_time` int DEFAULT '0',
  `idle_time` int DEFAULT '0',
  `status` enum('ACTIVE','COMPLETED','ABNORMAL') DEFAULT 'ACTIVE',
  PRIMARY KEY (`login_session_id`),
  KEY `fk_login_lab_session` (`session_id`),
  KEY `fk_login_student` (`student_id`),
  KEY `fk_login_computer` (`computer_id`),
  CONSTRAINT `fk_login_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`computer_id`),
  CONSTRAINT `fk_login_lab_session` FOREIGN KEY (`session_id`) REFERENCES `lab_sessions` (`session_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_login_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_sessions`
--

LOCK TABLES `login_sessions` WRITE;
/*!40000 ALTER TABLE `login_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `student_id` int NOT NULL AUTO_INCREMENT,
  `student_number` varchar(30) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `student_number` (`student_number`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','LECTURER','EXAMINER') NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-05 11:42:37
