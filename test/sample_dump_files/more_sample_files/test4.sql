
CREATE TABLE IF NOT EXISTS `test_table_4` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `somestr` VARCHAR(8) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1;

INSERT INTO `test_table_4` (`somestr`) VALUES ('a');
INSERT INTO `test_table_4` (`somestr`) VALUES ('b');
INSERT INTO `test_table_4` (`somestr`) VALUES ('c');
INSERT INTO `test_table_4` (`somestr`) VALUES ('d');
INSERT INTO `test_table_4` (`somestr`) VALUES ('e');