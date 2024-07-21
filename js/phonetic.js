let listen, record, compare
let audio_ph = 'phonetics'
let nav_i = 1
let words = {}
let wordsKeys = {}
let practices = {}
httpGet('audio/words.json', 'json').then(r => {
    if (r) {
        words = r
        wordsKeys = Object.keys(r)
        loadDb(() => loadPractice(true))
    } else {
        console.log('Load error2: words.json')
    }
}).catch(e => {
    console.log('Load error1: words.json')
})

// 导航切换
let navEl = SA('#nav li')
navEl.forEach(el => {
    el.addEventListener('click', function () {
        let i = 0
        navEl.forEach(el => {
            i++
            el.removeAttribute('class')
            if (el === this) {
                this.className = 'active'
                let boxEl = SE(`#chartBox > div:nth-of-type(${i})`)
                if (boxEl) {
                    nav_i = i
                    SA('#chartBox > div').forEach(el => el.style.display = 'none')
                    boxEl.style.display = 'block'
                }
            }
        })
    })
})

// 切换音标声音
SA('#option_gender input[name="gender"]').forEach(el => {
    el.addEventListener('click', function () {
        audio_ph = this.value
    })
})

// 点击发音
SA('.table1 td[key]').forEach(el => {
    el.addEventListener('click', function () {
        SA('.table1 td[class]').forEach(el => el.removeAttribute('class'))
        this.className = 'active'
        let k = this.getAttribute('key')
        playAudio(`audio/${audio_ph}/${k}.mp3`)
        loadDetails(k)
    })
})

// 自动播放
ID('auto_player').addEventListener('click', function () {
    if (!wordsKeys) return
    let _this = this
    if (this.getAttribute('state') === 'stop') {
        this.setAttribute('state', 'play')
        this.innerText = '停止播放'
    } else {
        this.setAttribute('state', 'stop')
        this.innerText = '自动播放'
        if (window._Audio) window._Audio.pause()
        return
    }
    let i = 0
    let p = function (i) {
        if (_this.getAttribute('state') === 'stop') return
        if (nav_i !== 2) {
            let el = ID('auto_player')
            el.setAttribute('state', 'stop')
            el.innerText = '自动播放'
            return
        }
        if (!wordsKeys[i]) i = 0
        let k = wordsKeys[i]
        SA('.table1 td[class]').forEach(el => el.removeAttribute('class'))
        let el = SE(`#chart2 .table1 td[key=${k}]`)
        if (el) el.className = 'active'
        playAudio(`audio/${audio_ph}/${k}.mp3`, function () {
            setTimeout(() => p(i + 1), 200)
        })
        loadDetails(k)
    }
    p(i)
})

// 只显示音标切换
ID('only_phonetic').addEventListener('click', function () {
    loadPractice(!this.checked)
})

// 清理计数
ID('clear_num_but').addEventListener('click', function () {
    db.clear('phonetic').then(_ => {
        // console.log('phonetic clear ok.')
        loadDb(() => loadPractice(!ID('only_phonetic').checked))
    }).catch(e => console.warn('phonetic clear error:', e))
})

async function loadDb(callback) {
    await idb('phonetic', 1, initPhonetic).then(r => db = r)
    await sleep(100)

    let row
    for (let k of wordsKeys) {
        let v = words[k]
        let name = v.ph.trim()
        await db.readByIndex('phonetic', 'name', name).then(r => row = r).catch(e => console.warn('phonetic readByIndex error:', e))
        if (!row) {
            row = {name: name, dayNum: 0, practiceNum: 0, playNum: 0, createDate: new Date().toJSON()}
            await db.create('phonetic', row).then(r => {
                // console.log('phonetic create:', r.target.result, r)
            }).catch(e => console.warn('phonetic create error:', e))
        }
        practices[name] = row

        if (v.words) {
            for (let word of v.words) {
                let name = word.name.trim()
                await db.readByIndex('phonetic', 'name', name).then(r => row = r).catch(e => console.warn('phonetic readByIndex error:', e))
                if (!row) {
                    row = {name: name, dayNum: 0, practiceNum: 0, playNum: 0, createDate: new Date().toJSON()}
                    await db.create('phonetic', row).then(r => {
                        // console.log('phonetic create:', r.target.result, r)
                    }).catch(e => console.warn('phonetic create error:', e))
                }
                practices[name] = row
            }
        }
    }

    typeof callback === 'function' && callback()
}

async function additionNum(name, practiceNum, playNum) {
    let row = {}
    await db.readByIndex('phonetic', 'name', name).then(r => row = r).catch(e => console.warn('phonetic readByIndex error:', e))
    if (!row) {
        row = {
            name: name,
            dayNum: practiceNum > 0 ? 1 : 0,
            practiceNum: practiceNum || 0,
            playNum: playNum || 0,
            createDate: new Date().toJSON()
        }
        await db.create('phonetic', row).then(r => {
            // console.log('phonetic create:', r.target.result, r)
        }).catch(e => console.warn('phonetic create error:', e))
    } else {
        let data = {}
        if (practiceNum > 0) {
            let d = new Date()
            d.setHours(d.getHours() - 4) // 每天凌晨4点做分隔
            let nowYmd = getDate(d, true).replace(/\D/g, '')
            if (nowYmd > (row.lastYmd || 0)) {
                data.dayNum = (row.dayNum || 0) + 1
                data.lastYmd = nowYmd
            }
            data.practiceNum = (row.practiceNum || 0) + practiceNum
        }
        if (playNum > 0) data.playNum = (row.playNum || 0) + playNum
        db.update('phonetic', row.id, data).then(r => {
            // console.log('phonetic update:', r.type, r)
        }).catch(e => {
            let err = e.target.error.message
            console.warn('phonetic update error:', err)
        })
    }
}

function practiceNumAdd(n) {
    let el = ID('practice_num')
    if (el) el.innerText = n
}

function loadDetails(key) {
    if (!words || !words[key]) return
    let v = words[key]
    let s = `<ul>`
        + `<li><span path="phonetics/${key}" class="mx-icon-sound-square male"></span> `
        + `<span path="phonetics2/${key}" class="mx-icon-sound-square female"></span> /${v.ph}/</li>`
    for (let word of v.words) {
        s += `<li><span path="words/${word.name}" class="${word.only_uk ? 'mx-icon-sound-uk' : 'mx-icon-sound'}"></span> `
            + `${word.html} ${word.ph ? '/' + word.ph + '/' : ''}</li>`
    }
    s += `<li class="similar">近似音：${v.similar}</li>`
    s += `<li class="mouth"><img src="audio/img/1/${key}.gif" title="口型图"></li>`
    // s += `<li><img src="audio/img/2/${key}.gif"></li>`
    s += `<li class="mouth3"><img src="audio/img/3/${key}.gif" title="口腔图"></li>`
    s += `</ul>`
    let el = SE(`#chart${nav_i} .details`)
    if (el) {
        el.innerHTML = s
        el.querySelectorAll('span[path]').forEach(el2 => {
            el2.addEventListener('click', function () {
                playAudio('audio/' + this.getAttribute('path') + '.mp3')
            })
        })
    }
}

function loadPractice(isAll) {
    let s = ''
    let i = 0
    wordsKeys.forEach(k => {
        let v = words[k]
        i++
        s += getTR(1, i, v.ph, v.ph, k, practices[v.ph] || {})
        if (isAll && v.words) {
            for (let word of v.words) {
                i++
                s += getTR(2, i, word.name, word.html, word.name, practices[word.name] || {})
            }
        }
    })
    ID('practice_box').querySelector('tbody').innerHTML = s

    // 播放
    let plEl = SA('.mx_button[data-action="play"]')
    plEl.forEach(el => {
        el.addEventListener('click', () => {
            let total = plEl.length
            let line = Number(el.parentNode.dataset.line)
            ddi({
                fullscreen: true,
                title: '',
                body: `<div class="mx-row">
                    <div class="mx-col">
                        <div class="player_box">
                            <div class="dialog_title">听力练习</div>
                            <div id="dialog_content"></div>
                            <div id="player_listen"></div>
                            <div class="divider"><b><span id="current_line">${line}</span> / ${total}</b></div>
                            <div class="form_item">
                                <div class="item_label">重复次数</div>
                                <div class="item_content"><input id="player_num" type="number" value="1" min="1" class="item_input"></div>
                            </div>
                        </div>
                    </div>
                    <div class="mx-col"></div>
                </div>`,
                onClose: () => {
                    listen.stop()
                    loadDb(() => loadPractice(!ID('only_phonetic').checked))
                }
            })

            ID('dialog_content').innerHTML = el.parentNode.parentNode.querySelector('.tb_word').innerHTML

            let practiceNum = 0
            let url = `audio/${el.parentNode.dataset.type > 1 ? 'words' : audio_ph}/${el.parentNode.dataset.filename}.mp3`
            let key = el.parentNode.dataset.key
            listen = playerListen('player_listen', {
                url,
                onReady: function () {
                    listen.play()
                },
                onFinish: () => {
                    additionNum(key, 0, 1)
                    let nEl = ID('player_num')
                    let n = nEl && nEl.value ? Number(nEl.value) : 2
                    practiceNum++
                    if (practiceNum >= n) {
                        let nextLine = line + 1
                        line = nextLine > total ? 1 : nextLine
                        let nextTr = SE(`#practice_box tbody tr:nth-of-type(${line})`)
                        if (nextTr) {
                            practiceNum = 0
                            ID('current_line').innerText = line
                            ID('dialog_content').innerHTML = nextTr.querySelector('.tb_word').innerHTML
                            let opEl = nextTr.querySelector('.tb_operate')
                            listen.load(`audio/${opEl.dataset.type > 1 ? 'words' : audio_ph}/${opEl.dataset.filename}.mp3`)
                            key = opEl.dataset.key
                        }
                    } else {
                        listen.play()
                    }
                }
            })
        })
    })

    // 跟读
    let RarEl = SA('.mx_button[data-action="read_and_record"]')
    RarEl.forEach(el => {
        el.addEventListener('click', () => {
            let total = RarEl.length
            let line = Number(el.parentNode.dataset.line)
            ddi({
                fullscreen: true,
                title: '',
                body: `<div class="mx-row">
                    <div class="mx-col">
                        <div class="player_box">
                            <div class="dialog_title">跟读练习</div>
                            <div id="dialog_content"></div>
                            <div id="player_listen"></div>
                            <div id="player_record"></div>
                            <div id="player_compare"></div>
                            <div class="divider"><b><span id="practice_num">0</span> 次</b></div>
                            <div class="mx_center">
                                <button class="mx_button medium" id="next_but">Next (<span>${line}</span>/${total})</button>
                            </div>
                        </div>
                    </div>
                    <div class="mx-col" id="dialog_img"></div>
                </div>`,
                onClose: () => {
                    listen.stop()
                    loadDb(() => loadPractice(!ID('only_phonetic').checked))
                }
            })

            let isWord = el.parentNode.dataset.type > 1
            let filename = el.parentNode.dataset.filename
            ID('dialog_img').innerHTML = isWord ? '' : `<img src="audio/img/1/${filename}.gif" style="object-fit:contain">`
            ID('dialog_content').innerHTML = el.parentNode.parentNode.querySelector('.tb_word').innerHTML
            let nextEl = ID('next_but')
            nextEl.disabled = true

            // next
            ID('next_but').addEventListener('click', function () {
                let nextLine = line + 1
                let i = nextLine > total ? 1 : nextLine
                this.querySelector('span').innerText = String(i)
                ID('practice_num').innerText = '0'

                let nextBut = SE(`#practice_box tbody tr:nth-of-type(${i}) .mx_button[data-action="read_and_record"]`)
                if (nextBut) nextBut.click()
            })

            let practiceNum = 0
            let maxDuration = 1000
            let url = `audio/${isWord ? 'words' : audio_ph}/${filename}.mp3`
            listen = playerListen('player_listen', {
                url,
                onReady: function (duration) {
                    maxDuration = Math.ceil(duration * 10) * 100 + 200
                    record.setMaxDuration(maxDuration)
                },
                onPlay: () => {
                    nextEl.disabled = true
                },
                onFinish: () => record.start(), // 开始录音
            })
            record = playerRecord('player_record', {
                maxDuration,
                onStop: () => {
                    compare.load(url)
                    compare.once('finish', () => {
                        let t = setTimeout(() => listen.showControls(), maxDuration + 1000) // 显示开始录音按钮
                        setTimeout(() => {
                            compare.loadBlob(record.blob)
                            compare.once('finish', () => {
                                clearTimeout(t)
                                listen.showControls() // 显示播放按钮
                                nextEl.disabled = false // 解除禁用
                                practiceNumAdd(++practiceNum)
                                additionNum(el.parentNode.dataset.key, 1, 0)
                            })
                        }, 100)
                    })
                }
            })
            compare = playerCompare('player_compare')
        })
    })

    // 朗读
    let RfaEl = SA('.mx_button[data-action="repeat_from_audio"]')
    RfaEl.forEach(el => {
        el.addEventListener('click', () => {
            let total = RfaEl.length
            let line = Number(el.parentNode.dataset.line)
            ddi({
                fullscreen: true,
                title: '',
                body: `<div class="mx-row">
                    <div class="mx-col">
                        <div class="player_box">
                            <div class="dialog_title">朗读练习</div>
                            <div id="dialog_content"></div>
                            <div id="player_listen" style="display:none"></div>
                            <div id="player_record"></div>
                            <div id="player_compare"></div>
                            <div class="divider"><b><span id="practice_num">0</span> 次</b></div>
                            <div class="mx_center">
                                <button class="mx_button medium" id="next_but">Next (<span>${line}</span>/${total})</button>
                            </div>
                        </div>
                    </div>
                    <div class="mx-col" id="dialog_img"></div>
                </div>`,
                onClose: () => {
                    listen.stop()
                    loadDb(() => loadPractice(!ID('only_phonetic').checked))
                }
            })

            let isWord = el.parentNode.dataset.type > 1
            let filename = el.parentNode.dataset.filename
            ID('dialog_img').innerHTML = isWord ? '' : `<img src="audio/img/1/${filename}.gif" style="object-fit:contain">`
            ID('dialog_content').innerHTML = el.parentNode.parentNode.querySelector('.tb_word').innerHTML
            let nextEl = ID('next_but')
            nextEl.disabled = true

            // next
            ID('next_but').addEventListener('click', function () {
                let nextLine = line + 1
                let i = nextLine > total ? 1 : nextLine
                this.querySelector('span').innerText = String(i)
                ID('practice_num').innerText = '0'

                let nextBut = SE(`#practice_box tbody tr:nth-of-type(${i}) .mx_button[data-action="repeat_from_audio"]`)
                if (nextBut) nextBut.click()
            })

            let practiceNum = 0
            let maxDuration = 3000
            let url = `audio/${isWord ? 'words' : audio_ph}/${filename}.mp3`
            listen = playerListen('player_listen', {
                url,
                onReady: function (duration) {
                    maxDuration = Math.ceil(duration * 10) * 100 + 200
                    record.setMaxDuration(maxDuration)
                }
            })
            record = playerRecord('player_record', {
                showStartBut: true,
                maxDuration,
                onStart: () => {
                    nextEl.disabled = true
                },
                onStop: () => {
                    compare.load(url)
                    compare.once('finish', () => {
                        let t = setTimeout(() => record.showStartBut(), maxDuration + 1000)
                        setTimeout(() => {
                            compare.loadBlob(record.blob)
                            compare.once('finish', () => {
                                clearTimeout(t)
                                record.showStartBut()
                                nextEl.disabled = false // 解除禁用
                                practiceNumAdd(++practiceNum)
                                additionNum(el.parentNode.dataset.key, 1, 0)
                            })
                        }, 100)
                    })
                },
            })
            compare = playerCompare('player_compare')
        })
    })
}

function getTR(type, line, key, name, filename, row) {
    return `<tr>
                <td class="tb_index">${line}</td>
                <td class="tb_word">${name}</td>
                <td class="tb_num">${row.dayNum}</td>
                <td class="tb_num">${row.practiceNum}</td>
                <td class="tb_num">${row.playNum}</td>
                <td class="tb_operate" data-type="${type}" data-line="${line}" data-key="${key}" data-filename="${filename}">
                    <button class="mx_button" data-action="play">播放</button>
                    <button class="mx_button mx_button_warning" data-action="read_and_record">跟读</button>
                    <button class="mx_button mx_button_danger" data-action="repeat_from_audio">朗读</button>
                </td>
            </tr>`
}

function playAudio(url, callback) {
    if (!window._Audio) window._Audio = new Audio()
    let a = window._Audio
    a.src = url
    a.play()
    a.onended = function () {
        typeof callback === 'function' && callback()
    }
}

function httpGet(url, type, headers, notStrict) {
    return new Promise((resolve, reject) => {
        let c = new XMLHttpRequest()
        c.responseType = type || 'text'
        c.timeout = 20000
        c.onload = function (e) {
            if (notStrict) {
                resolve(this.response)
            } else {
                if (this.status === 200) {
                    resolve(this.response)
                } else {
                    reject(e)
                }
            }
        }
        c.ontimeout = function (e) {
            reject(e)
        }
        c.onerror = function (e) {
            reject(e)
        }
        c.open("GET", url)
        if (headers) {
            headers.forEach(v => {
                c.setRequestHeader(v.name, v.value)
            })
        }
        c.send()
    })
}

function getDate(value, isDate) {
    let d
    if (typeof value === 'string') d = new Date(value)
    else if (typeof value === 'object') d = value
    if (!d) d = new Date()
    d.setMinutes(-d.getTimezoneOffset() + d.getMinutes(), d.getSeconds(), 0)
    let s = d.toISOString()
    if (isDate) {
        s = s.substring(0, 10)
    } else {
        s = s.replace('T', ' ')
        s = s.replace('.000Z', '')
    }
    return s
}

function sleep(delay) {
    return new Promise(r => setTimeout(r, delay))
}

function SE(s) {
    return document.querySelector(s)
}

function SA(s) {
    return document.querySelectorAll(s)
}

function ID(s) {
    return document.getElementById(s)
}
