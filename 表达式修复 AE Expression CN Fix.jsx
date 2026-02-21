var version = "1.1.0"; // 版本号
var updateDate = "2026-02-21"; // 更新日期
var githubLink = "https://github.com/feather-1500/ae-expression-cn-fix"; // GitHub链接
var email = "ahang@silky.site"; // 邮箱

// 收集合成相关的全局变量
var collectCompList = []; // 存储待收集的合成列表
var collectCompIndex = 0; // 当前处理的合成索引
var collectLayerIndex = 1; // 从1开始，因为AE的属性索引是从1开始的
var isCollecting = false; // 是否正在收集
var visitedComps = []; // 存储遍历过的合成列表
var collectCompBatchSize = 5; // 每批收集合成的数量

// 嵌套收集图层相关的全局变量
var collectLayerBatchSize = 10; // 每批收集图层数量（默认50）
var allLayersToScan = []; // 存储所有待扫描图层
var collectLayerIndex = 0; // 当前扫描到的图层索引

// 修复表达式相关的全局变量
var taskList = []; // 待处理的表达式列表
var fixBatchSize = 20; // 每批处理表达式的数量
var history = []; // 新增：记录修改历史
var currentTaskIndex = 0; // 当前处理的表达式索引

// UI对象的全局变量
var ui = {};


// 打开链接函数，兼容Windows和Mac系统
function openURL(url) {
    if ($.os.indexOf("Windows") !== -1) {
        system.callSystem('explorer "' + url + '"');
    } else {
        system.callSystem('open "' + url + '"');
    }
}

// 把这两个 map 提到全局，避免每次修复表达式时都重新创建
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
    'exposure': '曝光',
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

// 修复表达式函数，替换表达式中的英文参数名为中文，并记录修改历史以便回退
function fixExpressions(prop) {
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
    } else {
        log("非语言引发的错误表达式: " + oldExpression);
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
    ui.progressBar.value = 0;
}

// 日志输出函数，既输出到面板的日志框，也输出到控制台
var logBoxRef = null;

var logFirstTime = true;

var logIndex = 1; // 日志序号

function log(message) {
    if (logFirstTime) {
        ui.logBox.text = "";
        logFirstTime = false;
        logIndex = 1; // 初始化
    }

    //清空命令
    if (message === "clear") {
        ui.logBox.text = "";
        logIndex = 1;
        return;
    }


    if (ui.logBox) {
        // 添加序号
        var fullMessage = logIndex + ". " + message;
        ui.logBox.text = fullMessage + "\n" + ui.logBox.text;
        logIndex++;
    }
    $.writeln(message);
}

// 递归收集属性组中的表达式，修复其中的英文参数名（仅限有错误的表达式）
function collectErrorExpressions(propGroup) {
    if (!propGroup || !propGroup.numProperties) return;

    for (var i = 1; i <= propGroup.numProperties; i++) {
        var prop = propGroup.property(i);
        if (!prop) continue;

        try {
            if (prop.canSetExpression && prop.expressionEnabled && prop.expressionError && prop.expressionError !== "") {
                taskList.push(prop);
            }
        } catch (e) {}

        if (prop.numProperties !== undefined && prop.numProperties > 0) {
            collectErrorExpressions(prop);
        }
    }
}

// 收集合成中的所有图层,默认递归收集预合成中的图层，如果不需要递归收集预合成中的图层，传入 false 即可
function collectAllLayersFromComp(comp, isRecursive) {

    if (!comp) return;

    for (var i = 1; i <= comp.numLayers; i++) {

        var layer = comp.layer(i);
        if (!layer) continue;

        allLayersToScan.push(layer);

        // 如果不递归，直接跳过
        if (!isRecursive) continue;

        if (layer.source instanceof CompItem) {

            if (visitedComps.indexOf(layer.source) === -1) {
                visitedComps.push(layer.source);
                collectAllLayersFromComp(layer.source, true);
            }
        }
    }
}

// 按合成分批处理收集表达式，避免一次性处理过多导致界面卡死
function processCollectBatch() {

    if (collectCompIndex >= collectCompList.length) {
        isCollecting = false;
        log("收集完成，共找到 " + taskList.length + " 条错误表达式");
        ui.fixBtn.enabled = taskList.length > 0;
        return;
    }

    // 计算当前批次结束的合成索引
    var end = Math.min(
        collectCompIndex + collectCompBatchSize,
        collectCompList.length
    );

    // 遍历这一批合成
    for (var i = collectCompIndex; i < end; i++) {

        var comp = collectCompList[i];

        for (var j = 1; j <= comp.numLayers; j++) {
            var layer = comp.layer(j);
            if (layer) {
                collectErrorExpressions(layer);
            }
        }
    }

    collectCompIndex = end;

    // 更新进度（按合成数量）
    var progress = Math.round(
        (collectCompIndex / collectCompList.length) * 100
    );
    ui.progressBar.value = progress;

    app.scheduleTask("processCollectBatch()", 10, false);
}

// 按图层分批处理收集，避免一次性处理过多导致界面卡死
function processLayerCollectBatch() {

    var end = Math.min(
        collectLayerIndex + collectLayerBatchSize,
        allLayersToScan.length
    );

    for (var i = collectLayerIndex; i < end; i++) {

        var layer = allLayersToScan[i];
        collectErrorExpressions(layer);
    }

    collectLayerIndex = end;

    // 更新进度
    var percent = Math.round(
        (collectLayerIndex / allLayersToScan.length) * 100
    );

    ui.progressBar.value = percent;

    if (collectLayerIndex < allLayersToScan.length) {
        app.scheduleTask("processLayerCollectBatch()", 10, false);
    } else {

        log("收集完成，共找到 " + taskList.length + " 条错误表达式");

        ui.fixBtn.enabled = taskList.length > 0;

        allLayersToScan = [];
        collectLayerIndex = 0;
    }
}

// 分批处理表达式修复，避免一次性处理过多导致界面卡死

var isFixing = false; // 是否正在修复
var startTime = 0; // 开始时间
var endTime = 0; // 结束时间

function processFixBatch() {
    var end = Math.min(currentTaskIndex + fixBatchSize, taskList.length);

    for (var i = currentTaskIndex; i < end; i++) {
        fixExpressions(taskList[i]);
    }

    currentTaskIndex = end;

    // 更新进度条
    if (ui.progressBar) {
        ui.progressBar.value = Math.round((currentTaskIndex / taskList.length) * 100);
    }

    if (currentTaskIndex < taskList.length) {
        app.scheduleTask("processFixBatch()", 10, false);
    } else {
        endTime = new Date().getTime(); // 记录结束时间
        var timeTaken = ((endTime - startTime) / 1000).toFixed(2);
        log("处理完成，共处理: " + taskList.length + " 条错误表达式，耗时: " + timeTaken + " 秒");
        taskList = [];
        currentTaskIndex = 0;
        isFixing = false;

        app.endUndoGroup(); // 结束撤销组(开始时放在fix按钮点击事件中)
        ui.fixBtn.enabled = false; // 修复过程中禁用修复按钮，避免重复点击
        ui.revertBtn.enabled = true; // 启用回退按钮
    }
}

// 递归遍历图层及其预合成中的所有子图层，收集错误的表达式
function traversalLayer(layer) {
    if (!layer) {
        return;
    }

    collectErrorExpressions(layer);

    if (!(layer.source instanceof CompItem)) {
        return;
    }

    // 避免重复遍历同一个合成
    if (visitedComps.indexOf(layer.source) !== -1) {
        return;
    }

    visitedComps.push(layer.source); // 记录遍历过的合成，避免重复遍历
    var precomp = layer.source;

    for (var i = 1; i <= precomp.numLayers; i++) {
        var subLayer = precomp.layer(i);
        if (!subLayer) {
            continue;
        }

        traversalLayer(subLayer);
    }
}

var textDefault = "欢迎使用表达式修改工具！\n\n" +
    "版本号: " + version + "\n" +
    "更新日期: " + updateDate + "\n\n" +
    "本工具会将表达式中的英文参数名替换为中文，修复因语言环境导致的表达式错误。\n\n" +
    "使用方法：\n" + "1. 首先按需载入错误表达式（全局或当前合成）\n" +
    "2. 点击修复按钮进行修复\n" +
    "3. 如需回退修改，点击“回退修改”按钮。\n";

function setUI(thisObj) {
    // 主面板定义
    var main = (thisObj instanceof Panel) ?
        thisObj :
        new Window("palette", "表达式修改工具", undefined, {
            resizeable: true,
            independent: false
        });

    main.orientation = "column";
    main.alignChildren = "fill";
    main.alignChildren = ["fill", "top"];
    main.spacing = 10;
    main.margins = 10;

    // tab面板定义
    var tabPanel = main.add("tabbedpanel");
    tabPanel.alignChildren = "fill";
    tabPanel.alignment = ["fill", "fill"];
    tabPanel.maximumSize = [400, 450];
    // ----------------------------------
    // 创建三个标签页
    // ----------------------------------

    var tab1 = tabPanel.add("tab", undefined, "表达式修复");
    tab1.alignChildren = ["fill", "top"];
    var tab2 = tabPanel.add("tab", undefined, "设置");
    tab2.alignChildren = ["fill", "top"];
    var tab3 = tabPanel.add("tab", undefined, "关于");
    tab3.alignChildren = ["fill", "top"];

    // -----------------------------------
    // 标签页1：表达式修复
    // -----------------------------------

    // 详细信息区域
    var infoGroup = tab1.add("group");
    infoGroup.orientation = "column";
    infoGroup.alignChildren = "fill";

    // 详细信息切换按钮
    var isDetailVisible = true; // 详细信息默认值

    var toggleWrapper = infoGroup.add("group");
    toggleWrapper.alignChildren = ["fill", "top"];
    toggleWrapper.margins = [0, 10, 0, 0];

    var detailToggle = toggleWrapper.add("button", undefined, "▼ 详细信息");

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
    logBox.minimumSize.height = 200;
    logBox.maximumSize.height = 200;

    logBoxRef = logBox; // 绑定

    // 创建载入区域
    var loadGroup = tab1.add("group");
    loadGroup.orientation = "row";
    loadGroup.alignment = "center";
    loadGroup.spacing = 10;
    loadGroup.margins = [0, 10, 0, 0];

    // 下拉框
    var loadModeDropdown = loadGroup.add("dropdownlist", undefined, [
        "整个项目",
        "选中合成和嵌套的子合成",
        "仅选中合成的图层"
    ]);
    loadModeDropdown.preferredSize = [170, 30];
    loadModeDropdown.selection = 0; // 默认选中“整个项目”

    // 载入按钮
    var loadBtn = loadGroup.add("button", undefined, "载入");
    loadBtn.preferredSize = [80, 30];

    // 创建进度条
    var progressGroup = tab1.add("progressbar", undefined, 0, 100);
    progressGroup.preferredSize = [380, 20];
    ui.progressBar = progressGroup; // 挂到 ui

    // 创建修复按钮区域
    var fixButtonGroup = tab1.add("group");
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

    // 未选择合成时的提示文本
    var noCompText = "请先在'项目'面板激活一个合成！或者右键鼠标->[显示]->[在项目中显示合成]";

    //  载入按钮点击事件
    loadBtn.onClick = function() {

        if (isCollecting) return;

        log("clear"); // 每次载入前清空日志

        var mode = loadModeDropdown.selection.index;

        // 重置通用变量
        taskList = [];
        visitedComps = [];
        allLayersToScan = [];
        collectLayerIndex = 0;
        collectCompList = [];
        collectCompIndex = 0;

        ui.progressBar.value = 0;

        // =========================
        // 模式 0：整个项目
        // =========================
        if (mode === 0) {

            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof CompItem && item.numLayers > 0) {
                    collectCompList.push(item);
                }
            }

            if (collectCompList.length === 0) {
                log("没有可遍历的合成");
                return;
            }

            log("已找到 " + collectCompList.length + " 个合成，开始收集...");
            isCollecting = true;

            processCollectBatch();
        }

        // =========================
        // 模式 1：选中合成 + 子合成
        // =========================
        else if (mode === 1) {

            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("请先激活一个合成！");
                return;
            }

            visitedComps.push(comp);
            collectAllLayersFromComp(comp, true);

            if (allLayersToScan.length === 0) {
                log("没有可扫描的图层");
                return;
            }

            log("共扫描到 " + allLayersToScan.length + " 个图层");
            processLayerCollectBatch();
        }

        // =========================
        // 模式 2：仅当前合成
        // =========================
        else if (mode === 2) {

            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("请先激活一个合成！");
                return;
            }

            visitedComps.push(comp);
            collectAllLayersFromComp(comp, false);

            if (allLayersToScan.length === 0) {
                log("没有可扫描的图层");
                return;
            }

            log("共扫描到 " + allLayersToScan.length + " 个图层");
            processLayerCollectBatch();
        }
    };

    fixBtn.onClick = function() {
        log("clear"); // 每次修复前清空日志

        if (taskList.length === 0) {
            log("没有需要修复的表达式");
            return;
        }

        if (!isFixing) {
            isFixing = true;
            startTime = new Date().getTime(); // 记录开始时间
        }
        app.beginUndoGroup("修复表达式"); // 开始撤销组
        processFixBatch(); // 启动分批处理
    };


    revertBtn.onClick = function() {
        revertAll();
        ui.revertBtn.enabled = false;
        ui.fixBtn.enabled = false;
    };

    ui.logBox = logBox;
    ui.fixBtn = fixBtn;
    ui.revertBtn = revertBtn;

    // -----------------------------------
    // 标签页2：设置
    // -----------------------------------

    // 提示如果出现界面卡顿，可以减小每批处理的数量
    var settingInfoGroup = tab2.add("group");
    settingInfoGroup.orientation = "column";
    settingInfoGroup.alignChildren = ["left", "top"];
    var settingInfoText = "如果处理过程中界面卡死情况，可以尝试减小每批处理的数量";
    settingInfoGroup.add("statictext", undefined, settingInfoText);
    // 上下边距
    settingInfoGroup.margins = [0, 10, 0, 10];

    // 设置每次批处理的数量
    var BatchSizeGroup = tab2.add("group");
    BatchSizeGroup.orientation = "column";
    BatchSizeGroup.alignChildren = ["left", "top"];

    // 每批处理合成数量设置
    var collectCompBatchSizeGroup = BatchSizeGroup.add("group");
    collectCompBatchSizeGroup.orientation = "row";
    collectCompBatchSizeGroup.add("statictext", undefined, "每批处理合成数量:");
    var collectCompBatchSizeInput = collectCompBatchSizeGroup.add("edittext", undefined, collectCompBatchSize.toString());
    collectCompBatchSizeInput.preferredSize.width = 50;
    var collectCompBatchSizeSaveBtn = collectCompBatchSizeGroup.add("button", undefined, "保存");
    collectCompBatchSizeSaveBtn.onClick = function() {
        var input = parseInt(collectCompBatchSizeInput.text);
        if (isNaN(input) || input <= 0) {
            alert("请输入一个有效的正整数！");
            collectCompBatchSizeInput.text = collectCompBatchSize.toString();
            return;
        }
        collectCompBatchSize = input;
        alert("每批处理合成数量已更新为: " + collectCompBatchSize);
    };

    // 每批处理图层数量设置
    var collectLayerBatchSizeGroup = BatchSizeGroup.add("group");
    collectLayerBatchSizeGroup.orientation = "row";
    collectLayerBatchSizeGroup.add("statictext", undefined, "每批处理图层数量:");
    var collectLayerBatchSizeInput = collectLayerBatchSizeGroup.add("edittext", undefined, collectLayerBatchSize.toString());
    collectLayerBatchSizeInput.preferredSize.width = 50;
    var collectLayerBatchSizeSaveBtn = collectLayerBatchSizeGroup.add("button", undefined, "保存");
    collectLayerBatchSizeSaveBtn.onClick = function() {
        var input = parseInt(collectLayerBatchSizeInput.text);
        if (isNaN(input) || input <= 0) {
            alert("请输入一个有效的正整数！");
            collectLayerBatchSizeInput.text = collectLayerBatchSize.toString();
            return;
        }
        collectLayerBatchSize = input;
        alert("每批处理图层数量已更新为: " + collectLayerBatchSize);
    };


    // 每批处理表达式数量设置
    var fixBatchSizeGroup = BatchSizeGroup.add("group");
    fixBatchSizeGroup.orientation = "row";

    fixBatchSizeGroup.add("statictext", undefined, "每批处理表达式数量:");
    var fixBatchSizeInput = fixBatchSizeGroup.add("edittext", undefined, fixBatchSize.toString());
    fixBatchSizeInput.preferredSize.width = 50;
    var fixBatchSizeSaveBtn = fixBatchSizeGroup.add("button", undefined, "保存");
    fixBatchSizeSaveBtn.onClick = function() {
        var input = parseInt(fixBatchSizeInput.text);
        if (isNaN(input) || input <= 0) {
            alert("请输入一个有效的正整数！");
            fixBatchSizeInput.text = fixBatchSize.toString();
            return;
        }
        fixBatchSize = input;
        alert("每批处理数量已更新为: " + fixBatchSize);
    };

    // -----------------------------------
    // 标签页3：关于
    // -----------------------------------
    var aboutText = "表达式修改工具 v" + version + "\n\n" +
        "更新日期: " + updateDate + "\n\n" +
        "本工具由 feather-1500 sakamoto-king 开发，旨在帮助 After Effects 用户修复因语言环境导致的表达式错误。\n\n" +
        "GitHub: " + githubLink + "\n\n" +
        "感谢使用！如有任何问题或建议，请随时联系我。\n" +
        "邮箱: " + email + "\n";
    var aboutTextBox = tab3.add("edittext", undefined, aboutText, {
        multiline: true,
        scrollable: true,
        readonly: true
    });
    aboutTextBox.minimumSize.height = 200;



    // 当前版本
    var versionGroup = tab3.add("group");
    versionGroup.orientation = "row";
    versionGroup.add("statictext", undefined, "当前版本: " + version);

    // 现在版本
    var currentVersionGroup = tab3.add("group");
    currentVersionGroup.orientation = "row";
    var currentVersionText = currentVersionGroup.add("statictext", undefined, "最新版本:");

    // 检查更新按钮
    var checkUpdateBtn = currentVersionGroup.add("button", undefined, "检查更新");
    checkUpdateBtn.onClick = function() {
        alert("还未实装检查更新功能，敬请期待！");
    };

    // 访问GitHub按钮
    var githubBtn = currentVersionGroup.add("button", undefined, "访问GitHub");
    githubBtn.onClick = function() {
        var url = githubLink;
        openURL(url);
    };


    main.layout.layout(true);
    main.layout.resize();
    return main;
}

var myPanel = setUI(this);

if (myPanel instanceof Window) {
    myPanel.center();
    myPanel.show();
} else {
    myPanel.layout.layout(true);
}