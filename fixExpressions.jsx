var taskList = []; // 待处理的表达式列表
var currentTaskIndex = 0; // 当前处理的表达式索引
var batchSize = 20; // 每批处理20个表达式
var history = []; // 新增：记录修改历史

function fixExpressions(prop) {
    var effectNameMap = {
        'color control': '颜色控制',
        'slider control': '滑块控制',
        'angle control': '角度控制',
        'point control': '点控制',
        'checkbox control': '复选框控制',
        'fill': '填充',
        'stroke': '描边',
        'gaussian blur': '高斯模糊',
        'fast blur': '快速模糊',
        'motion blur': '动态模糊',
        'radial blur': '径向模糊',
        'transform': '变换',
        'opacity': '不透明度',
        'levels': '色阶',
        'curves': '曲线',
        'exposure': '曲线',
        'hue/saturation': '色相/饱和度',
        'brightness & contrast': '亮度和对比度',
        'tint': '色调',
        'tritone': '三色调',
        'drop shadow': '投影',
        'glow': '发光',
        'gradient ramp': '渐变渐变',
        'mosaic': '马赛克',
        'noise': '杂色',
        'fractal noise': '分形杂色',
        'turbulent displace': '湍流置换',
        'offset': '位移',
        'echo': '回声',
        'time displacement': '时间置换',
        'posterize time': '时间色调分离',
        'venetian blinds': '百叶窗',
        'gradient': '渐变',
        'fill': '填充',
        'roughen edges': '毛边',
        'spherize': '球面化',
        'mesh warp': '网格变形',
        'ripple': '波纹',
        'paint': '绘画',
        'brush strokes': '画笔描边',
        'cartoon': '卡通',
        'texturize': '纹理化',
    };

    var paramNameMap = {
        'color': '颜色',
        'slider': '滑块',
        'angle': '角度',
        'point': '点',
        'checkbox': '复选框',
        'opacity': '不透明度',
        'position': '位置',
        'scale': '缩放',
        'rotation': '旋转',
        'size': '大小',
        'intensity': '强度',
        'softness': '柔和度',
        'spread': '扩展',
        'distance': '距离',
        'amount': '数量',
        'depth': '深度',
        'thickness': '粗细',
        'offset': '偏移',
        'evolution': '演化',
        'radius': '半径',
        'direction': '方向',
        'speed': '速度',
        'width': '宽度',
        'height': '高度'
    };

    var oldExpression = prop.expression;
    var expression = oldExpression;

    for (var effectName in effectNameMap) {
        var regex = new RegExp('"' + effectName + '"', 'gi');
        expression = expression.replace(regex, '"' + effectNameMap[effectName] + '"');
    }

    for (var paramName in paramNameMap) {
        var regex = new RegExp('"' + paramName + '"', 'gi');
        expression = expression.replace(regex, '"' + paramNameMap[paramName] + '"');
    }

    if (expression !== oldExpression) {
        history.push({
            prop: prop,
            oldExpr: oldExpression
        }); // 记录修改前的表达式
        log("修复表达式: " + oldExpression);
        prop.expression = expression;
    }
}

// 回退所有修改
function revertAll() {
    for (var i = 0; i < history.length; i++) {
        try {
            history[i].prop.expression = history[i].oldExpr;
        } catch (e) {}
    }
    log("已回退全部修改: " + history.length + " 条表达式");
    history = [];
    currentTaskIndex = 0;
    taskList = [];
    main.progressBar.value = 0;
}

// 日志输出函数，既输出到面板的日志框，也输出到控制台
var logBoxRef = null;

var logFirstTime = true;

var logIndex = 1; // 日志序号

function log(message) {
    if (logFirstTime) {
        logBoxRef.text = "";
        logFirstTime = false;
        logIndex = 1; // 初始化
    }

    if (logBoxRef) {
        // 添加序号
        var fullMessage = logIndex + ". " + message;
        logBoxRef.text = fullMessage + "\n" + logBoxRef.text;
        logIndex++;
    }
    $.writeln(message);
}



// 递归收集属性组中的表达式，并修复其中的英文参数名
function collectExpressions(propGroup) {

    if (!propGroup || !propGroup.numProperties) return;

    for (var i = 1; i <= propGroup.numProperties; i++) {
        var prop = propGroup.property(i);
        if (!prop) continue;

        try {
            if (prop.expression && prop.expression !== "") {
                taskList.push(prop); // 不修复，只加入队列
                // log("找到表达式: " + prop.expression);
            }
        } catch (e) {}

        if (prop.numProperties !== undefined && prop.numProperties > 0) {
            collectExpressions(prop);
        }
    }
}

// 递归收集属性组中的表达式，修复其中的英文参数名（仅限有错误的表达式）
function collectErrorExpressions(propGroup) {
    if (!propGroup || !propGroup.numProperties) return;

    for (var i = 1; i <= propGroup.numProperties; i++) {
        var prop = propGroup.property(i);
        if (!prop) continue;

        try {
            if (prop.canSetExpression && prop.expressionEnabled) {
                if (prop.expressionError && prop.expressionError !== "") {
                    taskList.push(prop);
                }
            }
        } catch (e) {}

        if (prop.numProperties !== undefined && prop.numProperties > 0) {
            collectErrorExpressions(prop);
        }
    }
}

// 分批处理表达式修复，避免一次性处理过多导致界面卡死
function processBatch() {
    var end = Math.min(currentTaskIndex + batchSize, taskList.length);

    for (var i = currentTaskIndex; i < end; i++) {
        fixExpressions(taskList[i]);
    }

    currentTaskIndex = end;

    // 更新进度条
    if (main && main.progressBar) {
        main.progressBar.value = Math.round((currentTaskIndex / taskList.length) * 100);
    }

    if (currentTaskIndex < taskList.length) {
        app.scheduleTask("processBatch()", 10, false);
    } else {
        log("处理完成，共处理: " + taskList.length + " 条表达式");
        taskList = [];
        currentTaskIndex = 0;
    }
}



function fixAllPrecompErrors() {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);

        if (!item || !(item instanceof CompItem) || item.numLayers == 0) {
            continue;
        }

        for (var j = 1; j <= item.numLayers; j++) {
            var layer = item.layer(j);
            if (!layer) {
                continue;
            }

            collectErrorExpressions(layer);
        }
    }
}


// 递归遍历图层及其预合成中的所有子图层，收集并修复表达式
function traversalLayer(layer) {
    if (!layer) {
        return;
    }

    // if (!(layer.source instanceof CompItem))
    // {
    //     $.write("非预合成");
    // }
    // $.writeln("图层【" + layer.name + "】");

    collectExpressions(layer);

    if (!(layer.source instanceof CompItem)) {
        return;
    }

    var precomp = layer.source;

    for (var i = 1; i <= precomp.numLayers; i++) {
        var subLayer = precomp.layer(i);
        if (!subLayer) {
            continue;
        }

        // $.writeln("子图层【" + subLayer.name + "】");
        traversalLayer(subLayer);
    }
}

// 遍历当前合成的所有图层，修复表达式
function fixOnePrecomp() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("请先激活一个合成！");
        return;
    }

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (!layer) {
            continue;
        }

        traversalLayer(layer);
    }
}

// 遍历项目中所有合成的所有图层，修复表达式
function fixAllPrecomp() {
    for (var i = 1; i <= app.project.numItems; i++) {
        var comp = app.project.item(i);

        if (!comp || !(comp instanceof CompItem) || comp.numLayers == 0) {
            continue;
        }

        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);
            if (!layer) {
                continue;
            }

            collectExpressions(layer);
        }
    }
}

var textDefault = "欢迎使用表达式修改工具！\n\n" +
    "本工具会将表达式中的英文参数名替换为中文，修复因语言环境导致的表达式错误。\n\n" +
    "使用方法：\n" + "1. 首先载入全部错误表达式然后点击修复\n" +
    "2. 如果仅需修复当前合成的错误表达式，点击“载入当前合成错误表达式”按钮然后再点击修复\n" +
    "3. 如需回退修改，点击“回退修改”按钮。\n";

function setUI() {
    // 主面板定义
    var main = new Window("palette", "表达式修改工具", undefined);
    main.orientation = "column";
    main.alignChildren = "fill";

    // 详细信息区域
    var infoGroup = main.add("group");
    infoGroup.orientation = "column";
    infoGroup.alignChildren = "fill";

    // 详细信息切换按钮
    var isDetailVisible = true; // 详细信息默认值
    var detailToggle = infoGroup.add("button", undefined, "▼ 详细信息");
    detailToggle.onClick = function() {
        isDetailVisible = !isDetailVisible;

        if (isDetailVisible) {
            detailPanel.maximumSize.height = 1000; // 够大即可
        } else {
            detailPanel.maximumSize.height = 0;
        }

        detailToggle.text = (isDetailVisible ? "▼" : "▶") + " 详细信息";

        main.layout.layout(true);
    }

    // 详细信息面板
    var detailPanel = infoGroup.add("panel", undefined, "");
    detailPanel.orientation = "column";
    detailPanel.alignChildren = "fill";
    detailPanel.visible = isDetailVisible;

    var logBox = detailPanel.add("edittext", undefined, textDefault, {
        multiline: true,
        scrollable: true,
        readonly: true
    });
    logBox.preferredSize = [380, 150];

    logBoxRef = logBox; // 绑定

    // 创建载入按钮区域
    var loadButtonGroup = main.add("group");
    loadButtonGroup.orientation = "row";
    loadButtonGroup.alignment = "center";
    loadButtonGroup.spacing = 20;

    // 全部修复按钮
    var loadAllPrecompBtn = loadButtonGroup.add("button", undefined, "载入全部错误表达式");
    loadAllPrecompBtn.preferredSize = [150, 30];

    // 单合成修复按钮
    var loadOnePrecompBtn = loadButtonGroup.add("button", undefined, "载入当前合成错误表达式");
    loadOnePrecompBtn.preferredSize = [180, 30];


    // 创建进度条
    var progressGroup = main.add("progressbar", undefined, 0, 100);
    progressGroup.preferredSize = [380, 20];
    main.progressBar = progressGroup; // 挂到 main

    // 创建修复按钮区域
    var fixButtonGroup = main.add("group");
    fixButtonGroup.orientation = "row";
    fixButtonGroup.alignment = "center";
    fixButtonGroup.spacing = 20;

    // 修复按钮
    var fixBtn = fixButtonGroup.add("button", undefined, "修复");
    fixBtn.preferredSize = [120, 30];
    fixBtn.enabled = false; // 初始状态禁用，只有载入后才启用

    // 回退修改按钮
    var revertBtn = fixButtonGroup.add("button", undefined, "回退修改");
    revertBtn.preferredSize = [120, 30];
    revertBtn.enabled = false; // 初始状态禁用，只有修复后才启用

    // 设置面板大小
    main.frameSize = [400, 300];

    loadOnePrecompBtn.onClick = function() {

        taskList = [];
        currentTaskIndex = 0;

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("请先激活一个合成！");
            return;
        }

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer) {
                collectErrorExpressions(layer); // 只抓错误表达式
            }
        }

        if (taskList.length === 0) {
            log("没有找到需要处理的错误表达式");
            return;
        }

        if (taskList.length > 0) {
            log("找到 " + taskList.length + " 条错误表达式");
        }
        fixBtn.enabled = true; // 启用修复按钮
    };
    loadAllPrecompBtn.onClick = function() {
        taskList = [];
        currentTaskIndex = 0;

        for (var i = 1; i <= app.project.numItems; i++) {
            var comp = app.project.item(i);

            if (!comp || !(comp instanceof CompItem) || comp.numLayers == 0) {
                continue;
            }

            for (var j = 1; j <= comp.numLayers; j++) {
                var layer = comp.layer(j);
                if (layer) {
                    collectErrorExpressions(layer); // 只抓错误表达式
                }
            }
        }

        if (taskList.length === 0) {
            log("没有找到错误的表达式");
            return;
        }

        log("找到 " + taskList.length + " 条错误表达式");
        fixBtn.enabled = true; // 启用修复按钮
    };


    fixBtn.onClick = function() {
        if (taskList.length === 0) {
            log("没有需要修复的表达式");
            return;
        }

        app.beginUndoGroup("修复表达式");
        processBatch(); // 启动分批处理
        fixBtn.enabled = false; // 修复过程中禁用修复按钮，避免重复点击
        revertBtn.enabled = true; // 启用回退按钮
    };


    revertBtn.onClick = function() {
        revertAll();
        revertBtn.enabled = false;
        fixBtn.enabled = false;
    };


    return main;
}

main = setUI();
main.center();
main.show();