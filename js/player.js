'use strict'

/**
 * @Author Ryan <dream39999@gmail.com>
 * @license MIT License
 */

function addClass(el, className) {
    if (!el || !className) return
    className = className.trim()
    let oldClassName = el.className.trim()
    if (!oldClassName) {
        el.className = className
    } else if (` ${oldClassName} `.indexOf(` ${className} `) === -1) {
        el.className += ' ' + className
    }
}

function rmClass(el, className) {
    if (!el.className) return
    className = className.trim()
    let newClassName = el.className.trim()
    if ((` ${newClassName} `).indexOf(` ${className} `) === -1) return
    newClassName = newClassName.replace(new RegExp('(?:^|\\s)' + className + '(?:\\s|$)', 'g'), ' ').trim()
    if (newClassName) {
        el.className = newClassName
    } else {
        el.removeAttribute('class')
    }
}

function hasClass(el, className) {
    if (!el.className) return false
    return (` ${el.className.trim()} `).indexOf(` ${className.trim()} `) > -1
}

// dialog
function ddi(option) {
    let o = Object.assign({
        title: '',
        body: '',
        fullscreen: false,
        onClose: null,
    }, option || {})
    let el = SE('.ddi .ddi_body')
    if (el) {
        el.innerHTML = o.body
    } else {
        document.body.insertAdjacentHTML('beforeend', `<div class="ddi_bg"></div>
<div class="ddi">
    <div class="ddi_modal ddi_dialog${o.fullscreen ? ' fullscreen' : ''}">
        <div class="ddi_head">${o.title}<i class="mx-icon-close"></i></div>
        <div class="ddi_body">${o.body}</div>
    </div>
</div>`)
        window.ddiOnClose = o.onClose
        addClass(document.body, 'mx_overflow_hidden')
        SE('.ddi_head .mx-icon-close').addEventListener('click', () => {
            removeDdi()
        })
        document.body.addEventListener('keyup', ddiEscEvent)
    }
}

function removeDdi() {
    rmClass(document.body, 'mx_overflow_hidden')
    SA('.ddi_bg,.ddi').forEach(e => e.remove())
    if (typeof window.ddiOnClose === 'function') window.ddiOnClose()
    window.ddiOnClose = null
    document.body.removeEventListener('keyup', ddiEscEvent)
}

function ddiEscEvent(e) {
    if (e.keyCode !== 27) return
    removeDdi()
}

// 播放
function playerListen(id, options) {
    if (!window._playerListen) window._playerListen = []
    let p = window._playerListen
    if (p[id]) {
        p[id].destroy()
    }

    // 创建元素
    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="mx_player">
    <div class="mx_p_top">
        <div class="mx_p_title">倾听 Listen</div>
        <div class="mx_p_time"><span class="mx_p_current"></span><span class="mx_p_duration"></span></div>
    </div>
    <div class="mx_surfer" id="${wid}"></div>
    <div class="mx_controls"><button type="button">Play</button></div>
</div>`

    // 初始参数
    let o = Object.assign({
        url: '',
        onReady: null,
        onPlay: null,
        onFinish: null,
    }, options)

    // 基本元素
    let p_current = did.querySelector('.mx_p_current')
    let p_duration = did.querySelector('.mx_p_duration')
    let p_controls = did.querySelector('.mx_controls')

    // 创建播放器
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight
    let ws, maxDuration
    ws = WaveSurfer.create({
        container: wsId,
        height: height,
        barWidth: 3,
        barHeight: 2,
        backend: 'WebAudio',
        backgroundColor: '#66CCCC', // 背景色
        waveColor: '#CCFF66', // 波纹色
        progressColor: '#FF9900', // 填充色(播放后)
        cursorColor: '#666633', // 指针色
        hideScrollbar: true,
    })
    o.url && ws.load(o.url)
    ws.hideControls = function () {
        p_controls.style.display = 'none'
    }
    ws.showControls = function () {
        p_controls.style.display = 'flex'
    }
    ws.on('ready', function () {
        maxDuration = ws.getDuration()
        if (maxDuration > 0) {
            p_duration.innerText = ' / ' + humanTime(maxDuration)
            p_current.innerText = '00:00:000'
        }
        typeof o.onReady === 'function' && o.onReady(maxDuration)
    })
    ws.on('loading', function (percents) {
        p_controls.style.display = percents === 100 ? 'flex' : 'none'
    })
    ws.on('audioprocess', function (duration) {
        p_current.innerText = humanTime(duration)
    })
    ws.on('play', function () {
        ws.hideControls()
        typeof o.onPlay === 'function' && o.onPlay.call(ws)
    })
    ws.on('finish', function () {
        p_current.innerText = humanTime(maxDuration)
        typeof o.onFinish === 'function' ? o.onFinish.call(ws) : ws.showControls()
    })
    p_controls.addEventListener('click', ws.playPause.bind(ws)) // 绑定事件
    window._playerListen[id] = ws
    return ws
}

// 录音
function playerRecord(id, options) {
    if (!navigator.mediaDevices) return
    if (!window._playerRecord) window._playerRecord = []
    let p = window._playerRecord
    if (p[id]) {
        if (p[id].ws) p[id].ws.destroy()
        if (p[id].recorder) p[id].recorder.destroy()
    }

    // 创建元素
    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="mx_player">
    <div class="mx_p_top">
        <div class="mx_p_title">录音 Record</div>
        <div class="mx_p_time"><span class="mx_p_current"></span><span class="mx_p_duration"></span></div>
    </div>
    <div class="mx_surfer" id="${wid}"></div>
    <div class="mx_controls">
        <div class="mx_circle mx_reverse"><i class="mx-icon mx-icon-voice"></i></div>
        <button type="button" style="display:none">Record</button>
    </div>
</div>`

    // 初始参数
    let o = Object.assign({
        showStartBut: false,
        maxDuration: 5 * 1000,
        mp3Enable: true, // safari 浏览器才启用
        onStart: null,
        onStop: null,
    }, options)

    // 元素
    let p_current = did.querySelector('.mx_p_current')
    let p_duration = did.querySelector('.mx_p_duration')
    let p_circle = did.querySelector('.mx_circle')
    let p_start = did.querySelector('.mx_controls button')
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight

    // 初始化: 苹果 Safari 隐藏录音器
    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isSafari) wsId.style.display = 'none'

    // 初始对象
    let obj = {
        duration: 0,
        recordStartTime: 0, // 开始录制时间
        recorder: null,
        mp3Recorder: null,
        microphone: null,
        ws: null,
        active: false,
        ButEl: {},
        blob: null,
    }

    // 录音中按钮效果
    obj.ButEl.start = () => addClass(p_circle, 'mx_on')

    // 录音停止按钮效果
    obj.ButEl.stop = () => rmClass(p_circle, 'mx_on')

    // 绑定开始录音事件
    p_start.addEventListener('click', function () {
        !obj.active && obj.start()
    })

    // 绑定停止录音事件
    p_circle.addEventListener('click', function () {
        if (!obj.active) return

        // 限制最短录音时长
        let minTime = isSafari ? 500 : 300 // 苹果浏览器性能差些，时间延长
        if (!obj.recordStartTime || ((new Date() * 1) - obj.recordStartTime < minTime)) return

        obj.stop()
    })

    obj.showStartBut = function () {
        p_start.style.display = 'flex'
        p_circle.style.display = 'none'
    }
    obj.hideStartBut = function () {
        p_start.style.display = 'none'
        p_circle.style.display = 'flex'
    }

    // 初始按钮显示
    o.showStartBut ? obj.showStartBut() : obj.hideStartBut()

    // 定时器
    let t, tEnd
    let timeOutStart = function () {
        obj.recordStartTime = new Date() * 1 // 开始录制时间
        tEnd = (new Date() * 1) + Number(o.maxDuration)
        t = setInterval(function () {
            let remain = tEnd - (new Date() * 1)
            if (remain > 0) {
                p_current.innerText = humanTime((o.maxDuration - remain) / 1000)
            } else {
                obj.stop()
                clearInterval(t)
                p_current.innerText = humanTime(o.maxDuration / 1000)
            }
        }, 30)
    }
    let timeOutStop = function () {
        if (tEnd < (new Date() * 1)) return
        let remain = tEnd - (new Date() * 1)
        if (remain > 0) {
            p_current.innerText = humanTime((o.maxDuration - remain) / 1000)
            clearInterval(t)
        }
    }

    // 设置最大录音时长
    obj.setMaxDuration = function (maxDuration) {
        o.maxDuration = Number(maxDuration)
    }

    // 捕获麦克风
    obj.captureMicrophone = function (callback) {
        navigator.mediaDevices.getUserMedia({audio: true}).then(function (stream) {
            obj.microphone = stream
            callback(obj.microphone)
        })
    }

    // 停止麦克风
    obj.stopMicrophone = function () {
        if (!obj.microphone) return
        if (obj.microphone.getTracks) {
            // console.log('microphone getTracks stop...');
            obj.microphone.getTracks().forEach(stream => stream.stop())
        } else if (obj.microphone.stop) {
            // console.log('microphone stop...');
            obj.microphone.stop()
        }
        obj.microphone = null
    }

    // 销毁
    obj.destroy = function () {
        obj.stopMicrophone()
        if (obj.recorder) {
            obj.recorder.destroy()
            obj.recorder = null
        }
        if (obj.mp3Recorder) {
            obj.mp3Recorder.close()
            obj.mp3Recorder = null
        }
        if (obj.ws) {
            obj.ws.destroy()
            obj.ws = null
        }
    }

    // 开始录制
    obj.start = function () {
        if (obj.active) return
        obj.active = true
        obj.recordStartTime = 0

        // 切换按钮显示
        if (o.showStartBut) obj.hideStartBut()

        // 开始录音回调
        typeof o.onStart === 'function' && o.onStart.call(obj)

        // 初始时间
        p_duration.innerText = ' / ' + humanTime(o.maxDuration / 1000)
        p_current.innerText = '00:00:000'

        if (obj.recorder) obj.recorder.destroy()
        if (isSafari) {
            if (o.mp3Enable) {
                obj.mp3Recorder = new mp3Recorder()
                obj.mp3Recorder.init().then(() => {
                    obj.mp3Recorder.startRecording()

                    timeOutStart() // 定时器
                    obj.ButEl.start() // 录音中
                }).catch(err => {
                    console.warn('vMsg error:', err)
                })
            } else {
                obj.captureMicrophone(function (stream) {
                    obj.recorder = RecordRTC(stream, {
                        type: 'audio',
                        disableLogs: true,
                        recorderType: StereoAudioRecorder,
                        sampleRate: 44100,
                        bufferSize: 4096,
                        numberOfAudioChannels: 2, // 声道 1, 录制文件会小一半
                    })
                    obj.recorder.startRecording()

                    timeOutStart() // 定时器
                    obj.ButEl.start() // 录音中
                })
            }
        } else {
            if (obj.ws === null) {
                obj.ws = WaveSurfer.create({
                    container: wsId,
                    height: height,
                    barWidth: 3,
                    barHeight: 2,
                    cursorColor: '#CED5E2', // 指针色
                    hideScrollbar: true,
                    interact: false,
                    plugins: [WaveSurfer.microphone.create()]
                })
                obj.ws.microphone.on('deviceReady', function (stream) {
                    obj.microphone = stream
                    setTimeout(() => {
                        obj.recorder = window.RecordRTC(stream, {type: 'audio', disableLogs: true})
                        obj.recorder.startRecording()

                        timeOutStart() // 定时器
                        obj.ButEl.start() // 录音中
                    }, 300)
                })
                obj.ws.microphone.on('deviceError', function (code) {
                    console.warn('Device error: ' + code)
                })
                obj.ws.microphone.start()
            } else {
                !obj.ws.microphone.active && obj.ws.microphone.start()
            }
        }
    }

    // 停止录音
    obj.stop = function () {
        if (!obj.active) return
        obj.active = false

        timeOutStop() // 停止定时器
        obj.ButEl.stop() // 停止录音

        // 非 Safari 停止录音器波纹
        !isSafari && obj.ws.microphone.active && obj.ws.microphone.stop()

        // 停止录音
        if (isSafari && o.mp3Enable) {
            obj.mp3Recorder.stopRecording().then(blob => {
                obj.blob = blob
                typeof o.onStop === 'function' && o.onStop.call(obj) // 停止录音回调
            }).catch(err => {
                console.warn('vMsg error', err)
            })
        } else {
            obj.recorder.stopRecording(function () {
                // obj.url = this.toURL();
                obj.blob = this.getBlob()
                typeof o.onStop === 'function' && o.onStop.call(obj) // 停止录音回调
            })
        }
    }
    window._playerRecord[id] = obj
    return obj
}

// 对比
function playerCompare(id, options) {
    if (!window._playerCompare) window._playerCompare = []
    let p = window._playerCompare
    if (p[id]) {
        p[id].destroy()
    }

    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="mx_player">
    <div class="mx_p_top">
        <div class="mx_p_title">对比 Compare</div>
        <div class="mx_p_time"><span class="mx_p_current"></span><span class="mx_p_duration"></span></div>
    </div>
    <div class="mx_surfer" id="${wid}"></div>
    <div class="mx_controls"><div class="mx_circle"><i class="mx-icon mx-icon-headset-c"></i></div></div>
</div>`

    // 初始参数
    let o = Object.assign({
        url: '',
        autoPlay: true,
    }, options)

    // 初始化
    let p_current = did.querySelector('.mx_p_current')
    let p_duration = did.querySelector('.mx_p_duration')
    let but = did.querySelector('.mx_circle')

    // 创建播放器
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight
    let ws = WaveSurfer.create({
        container: wsId,
        height: height,
        barWidth: 3,
        barHeight: 2,
        waveColor: '#FFFF66', // 波纹色
        progressColor: '#FFCC99', // 填充色(播放后)
        cursorColor: '#333', // 指针色
        hideScrollbar: true,
        interact: false,
    })
    o.url && ws.load(o.url)
    let maxDuration, isClickPlay
    ws.on('ready', function () {
        maxDuration = ws.getDuration()
        if (maxDuration > 0) {
            p_duration.innerText = ' / ' + humanTime(maxDuration)
            p_current.innerText = '00:00:000'
        }
        ws.setBackgroundColor('#66b1ff')

        // 自动播放
        if (o.autoPlay) {
            isClickPlay = true
            ws.play()
        }
    })
    ws.on('audioprocess', function (duration) {
        p_current.innerText = humanTime(duration)
    })
    ws.on('play', function () {
        addClass(but, 'mx_on')
    })
    ws.on('finish', function () {
        isClickPlay = false
        p_current.innerText = humanTime(maxDuration)
        ws.setBackgroundColor('')
        ws.empty()
        rmClass(but, 'mx_on')
    })
    window._playerCompare[id] = ws

    // 解决 Safari 浏览器自动播放音频失败问题
    // but.addEventListener('click', () => {
    //     isClickPlay && ws.play()
    // })
    return ws
}

function humanTime(s, isSecond) {
    if (s <= 0) return isSecond ? '00:00:00' : '00:00:000'
    let hs = Math.floor(s / 3600)
    let ms = hs > 0 ? Math.floor((s - hs * 3600) / 60) : Math.floor(s / 60)
    if (isSecond) {
        return zero(hs) + ':' + zero(ms) + ':' + zero(Math.floor(s % 60))
    } else {
        let se = (s % 60).toFixed(3).replace('.', ':')
        if (hs > 0) {
            return zero(hs) + ':' + zero(ms) + ':' + zero(se, 6)
        } else {
            return zero(ms) + ':' + zero(se, 6)
        }
    }
}

// 补零
function zero(value, digits) {
    digits = digits || 2
    let isNegative = Number(value) < 0
    let s = value.toString()
    if (isNegative) s = s.slice(1)
    let size = digits - s.length + 1
    s = new Array(size).join('0').concat(s)
    return (isNegative ? '-' : '') + s
}
