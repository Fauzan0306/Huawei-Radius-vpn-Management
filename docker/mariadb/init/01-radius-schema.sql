CREATE TABLE IF NOT EXISTS radcheck (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '==',
  value VARCHAR(253) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_radcheck_username (username),
  KEY idx_radcheck_attribute (attribute)
);

CREATE TABLE IF NOT EXISTS radreply (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '=',
  value VARCHAR(253) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_radreply_username (username),
  KEY idx_radreply_attribute (attribute)
);

CREATE TABLE IF NOT EXISTS radgroupcheck (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '==',
  value VARCHAR(253) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_radgroupcheck_groupname (groupname)
);

CREATE TABLE IF NOT EXISTS radgroupreply (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op CHAR(2) NOT NULL DEFAULT '=',
  value VARCHAR(253) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_radgroupreply_groupname (groupname)
);

CREATE TABLE IF NOT EXISTS radusergroup (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL DEFAULT '',
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  priority INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_radusergroup_username (username)
);

CREATE TABLE IF NOT EXISTS radacct (
  radacctid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  acctsessionid VARCHAR(64) NOT NULL DEFAULT '',
  acctuniqueid VARCHAR(32) NOT NULL DEFAULT '',
  username VARCHAR(64) NOT NULL DEFAULT '',
  realm VARCHAR(64) DEFAULT '',
  nasipaddress VARCHAR(15) NOT NULL DEFAULT '',
  nasportid VARCHAR(15) DEFAULT NULL,
  nasporttype VARCHAR(32) DEFAULT NULL,
  acctstarttime DATETIME DEFAULT NULL,
  acctupdatetime DATETIME DEFAULT NULL,
  acctstoptime DATETIME DEFAULT NULL,
  acctinterval INT DEFAULT NULL,
  acctsessiontime INT UNSIGNED DEFAULT NULL,
  authentic VARCHAR(32) DEFAULT NULL,
  connectinfo_start VARCHAR(50) DEFAULT NULL,
  connectinfo_stop VARCHAR(50) DEFAULT NULL,
  acctinputoctets BIGINT DEFAULT NULL,
  acctoutputoctets BIGINT DEFAULT NULL,
  calledstationid VARCHAR(50) NOT NULL DEFAULT '',
  callingstationid VARCHAR(50) NOT NULL DEFAULT '',
  acctterminatecause VARCHAR(32) NOT NULL DEFAULT '',
  servicetype VARCHAR(32) DEFAULT NULL,
  framedprotocol VARCHAR(32) DEFAULT NULL,
  framedipaddress VARCHAR(15) NOT NULL DEFAULT '',
  framedipv6address VARCHAR(45) NOT NULL DEFAULT '',
  framedipv6prefix VARCHAR(45) NOT NULL DEFAULT '',
  framedinterfaceid VARCHAR(44) NOT NULL DEFAULT '',
  delegatedipv6prefix VARCHAR(45) NOT NULL DEFAULT '',
  class VARCHAR(64) NOT NULL DEFAULT '',
  PRIMARY KEY (radacctid),
  UNIQUE KEY uniq_radacct_acctuniqueid (acctuniqueid),
  KEY idx_radacct_username (username),
  KEY idx_radacct_start (acctstarttime),
  KEY idx_radacct_stop (acctstoptime),
  KEY idx_radacct_session (acctsessionid)
);

CREATE TABLE IF NOT EXISTS radpostauth (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL DEFAULT '',
  pass VARCHAR(255) NOT NULL DEFAULT '',
  reply VARCHAR(32) NOT NULL DEFAULT '',
  authdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_radpostauth_username (username)
);

CREATE TABLE IF NOT EXISTS nas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nasname VARCHAR(128) NOT NULL,
  shortname VARCHAR(32) DEFAULT NULL,
  type VARCHAR(30) DEFAULT 'other',
  ports INT DEFAULT NULL,
  secret VARCHAR(60) NOT NULL DEFAULT 'secret',
  server VARCHAR(64) DEFAULT NULL,
  community VARCHAR(50) DEFAULT NULL,
  description VARCHAR(200) DEFAULT 'demo NAS',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_nas_nasname (nasname)
);

INSERT INTO radcheck (username, attribute, op, value)
SELECT 'demo.user', 'Cleartext-Password', ':=', 'demo12345'
WHERE NOT EXISTS (
  SELECT 1
  FROM radcheck
  WHERE username = 'demo.user'
    AND attribute = 'Cleartext-Password'
);

INSERT INTO radcheck (username, attribute, op, value)
SELECT 'demo.user', 'Simultaneous-Use', ':=', '1'
WHERE NOT EXISTS (
  SELECT 1
  FROM radcheck
  WHERE username = 'demo.user'
    AND attribute = 'Simultaneous-Use'
);

INSERT INTO radreply (username, attribute, op, value)
SELECT 'demo.user', 'Filter-Id', ':=', 'VPN_RADIUS'
WHERE NOT EXISTS (
  SELECT 1
  FROM radreply
  WHERE username = 'demo.user'
    AND attribute = 'Filter-Id'
);

