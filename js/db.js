'use strict'

/**
 * @Author Ryan <dream39999@gmail.com>
 * @license MIT License
 */

function idb(dbName, version, onupgradeneeded) {
    return new Promise((resolve, reject) => {
        let req = window.indexedDB.open(dbName, version)
        req.onupgradeneeded = onupgradeneeded // 首次创建或更高版本号时执行
        req.onerror = (e) => reject(e)
        req.onsuccess = () => {
            let db = req.result
            resolve({
                db,
                rStore(storeName) {
                    return db.transaction([storeName], 'readonly').objectStore(storeName)
                },
                wStore(storeName) {
                    return db.transaction([storeName], 'readwrite').objectStore(storeName)
                },
                read(storeName, id) {
                    return new Promise((resolve, reject) => {
                        let row = this.rStore(storeName).get(id)
                        row.onsuccess = () => resolve(row.result)
                        row.onerror = (e) => reject(e)
                    })
                },
                readByIndex(storeName, indexName, key) {
                    return new Promise((resolve, reject) => {
                        let row = this.rStore(storeName).index(indexName).get(key)
                        row.onsuccess = () => resolve(row.result)
                        row.onerror = (e) => reject(e)
                    })
                },
                create(storeName, data) {
                    return new Promise((resolve, reject) => {
                        let row = this.wStore(storeName).add(data)
                        row.onsuccess = (e) => resolve(e)
                        row.onerror = (e) => reject(e)
                    })
                },
                update(storeName, id, data) {
                    return new Promise((resolve, reject) => {
                        let wStore = this.wStore(storeName)
                        let row = wStore.get(id)
                        row.onsuccess = () => {
                            if (!row.result) return reject('result empty!')
                            let newData = Object.assign(row.result, data) // 覆盖
                            let r = wStore.put(newData)
                            r.onsuccess = (e) => resolve(e)
                            r.onerror = (e) => reject(e)
                        }
                        row.onerror = (e) => reject(e)
                    })
                },
                delete(storeName, id) {
                    return new Promise((resolve, reject) => {
                        let r = this.wStore(storeName).delete(id)
                        r.onsuccess = (e) => resolve(e)
                        r.onerror = (e) => reject(e)
                    })
                },
                clear(storeName) {
                    return new Promise((resolve, reject) => {
                        let r = this.wStore(storeName).clear()
                        r.onsuccess = (e) => resolve(e)
                        r.onerror = (e) => reject(e)
                    })
                },
                count(storeName, indexName, query) {
                    return new Promise((resolve, reject) => {
                        let store = this.rStore(storeName)
                        let r = indexName ? store.index(indexName).count(query) : store.count(query)
                        r.onsuccess = () => resolve(r.result)
                        r.onerror = (e) => reject(e)
                    })
                },
                getAll(storeName, indexName, query, count) {
                    return new Promise((resolve, reject) => {
                        let store = this.rStore(storeName)
                        let req = indexName ? store.index(indexName).getAll(query, count) : store.getAll(query, count)
                        req.onsuccess = () => resolve(req.result)
                        req.onerror = (e) => reject(e)
                    })
                },
                find(storeName, option) {
                    let {indexName, query, direction, offset, limit} = option || {}
                    return new Promise((resolve, reject) => {
                        let arr = []
                        let store = this.rStore(storeName)
                        let req = indexName ? store.index(indexName).openCursor(query, direction) : store.openCursor(query, direction)
                        let isAdvance = false
                        req.onsuccess = (e) => {
                            // let row = e.target.result
                            let row = req.result
                            if (row) {
                                // 偏移量
                                if (offset && !isAdvance) {
                                    row.advance(offset)
                                    isAdvance = true
                                    return
                                }

                                arr.push(row.value) // 返回值
                                if (limit && arr.length >= limit) {
                                    resolve(arr)
                                } else {
                                    row.continue()
                                }
                            } else {
                                resolve(arr)
                            }
                        }
                        req.onerror = (e) => reject(e)
                    })
                },
            })
        }
    })
}

function rmIdb(dbName) {
    return new Promise((resolve, reject) => {
        let db = window.indexedDB.deleteDatabase(dbName)
        db.onsuccess = (e) => resolve(e)
        db.onerror = (e) => reject(e)
        setTimeout(_ => reject('time out'), 2000)
    })
}

// 创建存储对象
function initPhonetic(e) {
    let store, db = e.target.result
    store = db.createObjectStore('phonetic', {keyPath: 'id', autoIncrement: true})
    store.createIndex('id', 'id', {unique: true})
    store.createIndex('name', 'name', {unique: true})
    store.createIndex('dayNum', 'dayNum')
    store.createIndex('practiceNum', 'practiceNum')
    store.createIndex('playNum', 'playNum')
    store.createIndex('lastYmd', 'lastYmd')
    store.createIndex('createDate', 'createDate')
}
