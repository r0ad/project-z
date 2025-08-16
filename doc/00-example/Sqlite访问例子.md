module.exports = {
	/** 
	 * @type {String} 数据库名称
	 */
	dbName: 'salary',
	/**
	 * 数据库地址
	 * @type {String} 推荐以下划线为开头   _doc/xxx.db
	 * @description 开发环境中数据库所在地址：文件管理/Android/data/io.dcloud.HBuilder/downloads/salary.db
	 * @description 打包安装后数据库所在地址：文件管理/Android/data/uni.UNI4312312(以UNI开头接数字)/downloads/salary.db
	 */
	dbPath: '_downloads/salary.db',
	/**
	 * 加班记录表名
	 * @description
	 * "time" DATE  PRIMARY KEY,"money" INTEGER,"notes" text,"info" text
	 */
	recordsTable: 'records',

	/**
	 * 判断数据库是否打开
	 * @returns {Boolean} 打开为 true，未打开为 false
	 */
	isOpen() {
		var open = plus.sqlite.isOpenDatabase({
			name: this.dbName,
			path: this.dbPath
		})
		return open;
	},

	/**
	 * 打开数据库，没有则创建
	 */
	openSqlite() {
		return new Promise((resolve, reject) => {
			plus.sqlite.openDatabase({
				name: this.dbName,
				path: this.dbPath,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	},

	/**
	 * 关闭数据库
	 */
	closeSqlite() {
		return new Promise((resolve, reject) => {
			plus.sqlite.closeDatabase({
				name: this.dbName,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	},

	/**
	 * 数据库建表 sql:'CREATE TABLE IF NOT EXISTS dbTable("id" varchar(50),"name" TEXT) 
	 * 创建 CREATE TABLE IF NOT EXISTS 、 dbTable 是表名，不能用数字开头、括号里是表格的表头
	 * @param {Object} dbTable 表名
	 * @param {Object} data 表列
	 * @example 创建表 DB.createTable(表名, 表的列)
	 * let sql = '"date" DATE  PRIMARY KEY,"money" INTEGER,"notes" text,"info" text';
	 * await DB.createTable('records', sql);
	 */
	createTable(dbTable, data) {
		return new Promise((resolve, reject) => {
			// executeSql: 执行增删改等操作的SQL语句
			plus.sqlite.executeSql({
				name: this.dbName,
				sql: `CREATE TABLE IF NOT EXISTS ${dbTable}(${data})`,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	},

	/**
	 * 数据库删表
	 * @param {Object} dbTable 表名
	 * @description 数据库删表 sql:'DROP TABLE dbTable'
	 */
	dropTable(dbTable) {
		return new Promise((resolve, reject) => {
			plus.sqlite.executeSql({
				name: this.dbName,
				sql: `DROP TABLE ${dbTable}`,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	},

	// 向表格里添加数据 sql:'INSERT INTO dbTable VALUES('x','x','x')'			对应新增
	// 或者 sql:'INSERT INTO dbTable ('x','x','x') VALUES('x','x','x')'	具体新增
	/**
	 * 向表格里添加数据
	 * @param {String} dbTable 表名
	 * @param {String} data 列值
	 * @param {String} condition 表头列名
	 * @example  
	 * let sql = `'${item.money}','${item.notes}','${item.time}'`;
	 * let condition = "'money','notes','time'";
	 * await DB.insertTableData("records", sql, condition);
	 */
	insertTableData(dbTable, data, condition) {
		// 判断有没有传参
		if (dbTable !== undefined && data !== undefined) {
			// 判断传的参是否有值
			var bol = (JSON.stringify(data) == "{}");
			if (!bol) {
				if (condition == undefined) {
					var sql = `INSERT INTO ${dbTable} VALUES('${data}')`;
				} else {
					var sql = `INSERT INTO ${dbTable} (${condition}) VALUES(${data})`;
				}
				// console.log(sql);
				return new Promise((resolve, reject) => {
					// 表格添加数据
					plus.sqlite.executeSql({
						name: this.dbName,
						sql: sql,
						success(e) {
							resolve(e);
						},
						fail(e) {
							reject(e);
						}
					})
				})
			} else {
				return new Promise((resolve, reject) => {
					reject("错误添加")
				})
			}
		} else {
			return new Promise((resolve, reject) => {
				reject("错误添加")
			})
		}
	},

	/**
	 * 根据条件向表格里添加数据  有数据更新、无数据插入
	 * (建表时需要设置主键) 例如 --- "roomid" varchar(50) PRIMARY KEY
	 * @param {String} dbTable 表名
	 * @param {String} data 列值
	 * @param {String} condition 表头列名
	 * @example  
	 * let sql = `'${item.money}','${item.notes}','${item.time}'`;
	 * let condition = "'money','notes','time'";
	 * await DB.insertTableData("records", sql, condition);
	 */
	insertOrReplaceData(dbTable, data, condition) {
		// 判断有没有传参
		if (dbTable !== undefined && data !== undefined) {
			if (condition == undefined) {
				var sql = `INSERT OR REPLACE INTO ${dbTable} VALUES('${data}')`;
			} else {
				var sql = `INSERT OR REPLACE INTO ${dbTable} (${condition}) VALUES(${data})`;
			}
			// console.log(sql);
			return new Promise((resolve, reject) => {
				// 表格添加数据
				plus.sqlite.executeSql({
					name: this.dbName,
					sql: sql,
					success(e) {
						resolve(e);
					},
					fail(e) {
						reject(e);
					}
				})
			})
		} else {
			return new Promise((resolve, reject) => {
				reject("错误添加")
			})
		}
	},

	/**
	 * 查询获取数据库里的数据 sql:'SELECT * FROM dbTable WHERE lname = 'lvalue''
	 * @param {String} dbTable 表名
	 * @param {String} [condition = ''] 查找条件
	 * @example
	 * const searchCondition = `WHERE date = '${day}'`
	 * await DB.selectTableData('表名', searchCondition);
	 */
	selectTableData(dbTable, condition = '') {
		if (dbTable !== undefined) {
			var sql = `SELECT * FROM ${dbTable} ${condition}`;
			return new Promise((resolve, reject) => {
				// 表格查询数据  执行查询的SQL语句
				plus.sqlite.selectSql({
					name: this.dbName,
					sql: sql,
					success(e) {
						resolve(e);
					},
					fail(e) {
						reject(e);
					}
				})
			})
		} else {
			return new Promise((resolve, reject) => {
				reject("错误查询")
			});
		}
	},

	/**
	 * 删除表里的数据 sql:'DELETE FROM dbTable WHERE lname = 'lvalue''
	 * @param {String} dbTable 表名
	 * @param {String} [condition = ''] 查找条件
	 * @example
	 * const searchCondition = `WHERE date = '${day}'`
	 * await DB.deleteTableData('表名', searchCondition);
	 */
	deleteTableData(dbTable, condition = '') {
		if (dbTable !== undefined) {
			var sql = `DELETE FROM ${dbTable} ${condition}`;
			return new Promise((resolve, reject) => {
				// 删除表数据
				plus.sqlite.executeSql({
					name: this.dbName,
					sql: sql,
					success(e) {
						resolve(e);
					},
					fail(e) {
						reject(e);
					}
				})
			})
		} else {
			return new Promise((resolve, reject) => {
				reject("错误删除")
			});
		}
	},

	// 修改数据表里的数据 sql:"UPDATE dbTable SET 列名 = '列值',列名 = '列值' WHERE lname = 'lvalue'"
	// 修改 UPDATE 、 dbTable 是表名, data: 要修改的列名=修改后列值, lname,lvalue 是查询条件的列名和列值
	updateTableData(dbTable, data, lname, lvalue) {
		if (lname == undefined) {
			var sql = `UPDATE ${dbTable} SET ${data}`;
		} else {
			var sql = `UPDATE ${dbTable} SET ${data} WHERE ${lname} = '${lvalue}'`;
		}
		// WHERE 前面是要修改的列名、列值，后面是条件的列名、列值
		return new Promise((resolve, reject) => {
			// 修改表数据
			plus.sqlite.executeSql({
				name: this.dbName,
				sql: sql,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	},

	// 获取指定数据条数  sql:"SELECT * FROM dbTable ORDER BY 'id' DESC LIMIT 15 OFFSET 'num'"
	// dbTable 表名, ORDER BY 代表排序默认正序, id 是排序的条件 DESC 代表倒序，从最后一条数据开始拿
	// LIMIT 15 OFFSET '${num}',这句的意思是跳过 num 条拿 15 条数据, num 为跳过多少条数据是动态值
	// 例 初始num设为0，就从最后的数据开始拿15条，下次不拿刚获取的数据，所以可以让num为15，这样就能一步一步的拿完所有的数据
	pullSQL(dbTable, id, num) {
		return new Promise((resolve, reject) => {
			plus.sqlite.selectSql({
				name: this.dbName,
				sql: `SELECT * FROM ${dbTable} ORDER BY '${id}' DESC LIMIT 15 OFFSET '${num}'`,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			})
		})
	}
}


import DB from "@/api/sqlite";

/**添加或者更新加班费，主键是日期
 * @param {Object} submitParam 单个日期的加班信息
 * @param {Number} submitParam.money 加班费
 * @param {String} submitParam.notes 备注
 * @param {Date} submitParam.date 加班日期
 * @param {String} submitParam.info 日历日期下面显示内容
 */
async function recordSalary(submitParam) {
	try {
		// 新增 DB.insertTableData(表名, 对应表头列的数据)
		let sql = `${submitParam.money},'${submitParam.notes}','${submitParam.date}','${submitParam.info}'`;
		let condition = "'money','notes','date','info'";
		await DB.insertOrReplaceData(DB.recordsTable, sql, condition);
		return '添加/更新加班费成功';
	} catch (e) {
		throw e;
	}
}

/**通过年月查询加班费记录
 * @param {String} month 日期
 * @example queryRecordsByMonth('2023-12')
 */
async function queryRecordsByMonth(month) {
	try {
		const searchCondition = `WHERE strftime('%Y-%m', date) = '${month}'`
		const records = await DB.selectTableData(DB.recordsTable, searchCondition);
		return records;
	} catch (e) {
		throw e;
	}
}

/**通过具体日期查询加班费记录
 * @param {String} day 日期
 * @example queryRecordsByMonth('2023-12-20')
 */
async function queryRecordsByDay(day) {
	try {
		const searchCondition = `WHERE date = '${day}'`
		const records = await DB.selectTableData(DB.recordsTable, searchCondition);
		return records;
	} catch (e) {
		throw e;
	}
}

/**通过具体日期删除该天的加班记录
 * @param {Object} day 日期
 * @example deleteRecordByDate('2023-12-20')
 */
async function deleteRecordByDate(day) {
	try {
		const searchCondition = `WHERE date = '${day}'`
		const result = await DB.deleteTableData(DB.recordsTable, searchCondition);
		return '删除记录成功';
	} catch (e) {
		throw e;
	}
}

export default {
	recordSalary,
	queryRecordsByMonth,
	queryRecordsByDay,
	deleteRecordByDate
}
