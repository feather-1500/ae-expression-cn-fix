
function fixExpressions(prop)
{
    var effectNameMap =
    {
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
        'cc particle world': 'CC 粒子世界',
        'cc cylinder': 'CC 圆柱体',
        'cc sphere': 'CC 球体',
        'cc lens': 'CC 镜头',
        'cc light sweep': 'CC 扫光',
        'cc light burst': 'CC 光束'
    };

    var paramNameMap =
    {
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

    var expression = prop.expression;
    for (var effectName in effectNameMap) {
        var regex = new RegExp('"' + effectName + '"', 'gi');
        expression = expression.replace(regex, '"' + effectNameMap[effectName] + '"');
    }

    for (var paramName in paramNameMap) {
        var regex = new RegExp('"' + paramName + '"', 'gi');
        expression = expression.replace(regex, '"' + paramNameMap[paramName] + '"');
    }
    
    prop.expression = expression;
}

function collectExpressions(propGroup)
{
    if (!propGroup || !propGroup.numProperties) return;
    
    for (var i = 1; i <= propGroup.numProperties; i++)
    {
        var prop = propGroup.property(i);
        if (!prop) continue;
        
        var propName = prop.name;
        var matchName = prop.matchName;
        
        // ----- 1. 当前属性是否有表达式？-----
        try
        {
            if (prop.expression && prop.expression !== "")
            {
                // $.writeln("【属性】" + propName);
                // $.writeln("【匹配名】" + matchName);
                // $.writeln("【启用】" + (prop.expressionEnabled ? "是" : "否"));
                // $.writeln("【表达式】\n" + prop.expression);
                // $.writeln("----------------------------------------\n");
                fixExpressions(prop);
            }
        }
        catch (e)
        {
            // 某些属性不支持表达式，访问 expression 会报错，忽略即可
        }
        
        if (prop.numProperties !== undefined && prop.numProperties > 0)
        {
            collectExpressions(prop);
        }
    }
}

function traversalLayer(layer)
{
    if (!layer)
    {
        return;
    }
    
    // if (!(layer.source instanceof CompItem))
    // {
    //     $.write("非预合成");
    // }
    // $.writeln("图层【" + layer.name + "】");

    collectExpressions(layer);

    if (!(layer.source instanceof CompItem))
    {
        return;
    }

    var precomp = layer.source;

    for (var i = 1; i <= precomp.numLayers; i++)
    {
        var subLayer = precomp.layer(i);
        if (!subLayer)
        {
            continue;
        }

        // $.writeln("子图层【" + subLayer.name + "】");
        traversalLayer(subLayer);
    }
}

function fixAllExpressions()
{
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem))
    {
        alert("请先激活一个合成！");
        return;
    }

    for (var i = 1; i <= comp.numLayers; i++)
    {
        var layer = comp.layer(i);
        if (!layer)
        {
            continue;
        }

        traversalLayer(layer);
    }
}

function setUI()
{
    // 主面板定义
    var mainPalette = new Window("palette", "表达式修改工具", undefined);
    mainPalette.orientation = "column";
    mainPalette.alignChildren = "fill";

    // 添加标题区域
    var headerGroup = mainPalette.add("group");
    headerGroup.orientation = "row";
    headerGroup.alignment = "fill";
    var titleText = headerGroup.add("statictext", undefined, "表达式批量修改工具");
    titleText.alignment = "center";

    // 创建状态显示区域
    var statusGroup = mainPalette.add("group");
    statusGroup.orientation = "row";
    statusGroup.alignment = "fill";
    var statusText = statusGroup.add("statictext", undefined, "就绪");
    statusText.preferredSize.width = 300;

    // 创建按钮区域
    var buttonGroup = mainPalette.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "center";
    buttonGroup.spacing = 20;

    // 执行修改按钮
    var executeBtn = buttonGroup.add("button", undefined, "执行修改");
    executeBtn.preferredSize = [120, 30];

    // 回退修改按钮
    var revertBtn = buttonGroup.add("button", undefined, "回退修改");
    revertBtn.preferredSize = [120, 30];

    var buttonGroup2 = mainPalette.add("group");
    buttonGroup2.orientation = "row";
    buttonGroup2.alignment = "center";
    buttonGroup2.spacing = 20;

    // 执行修改按钮
    var executeBtn2 = buttonGroup2.add("button", undefined, "执行修改2");
    executeBtn2.preferredSize = [120, 30];

    // 回退修改按钮
    var revertBtn2 = buttonGroup2.add("button", undefined, "回退修改2");
    revertBtn2.preferredSize = [120, 30];

    // 设置面板大小
    mainPalette.frameSize = [400, 300];

    executeBtn.onClick = function()
    {
        app.beginUndoGroup("修复表达式");
        fixAllExpressions();
    };

    revertBtn.onClick = function()
    {
        app.executeCommand(16);
    };

    executeBtn2.onClick = function()
    {
        app.beginUndoGroup("修复表达式");
        fixAllExpressions2();
    };

    revertBtn2.onClick = function()
    {
        app.executeCommand(16);
    };

    return mainPalette;
}

function fixAllExpressions2()
{
    for (var i = 1; i <= app.project.numItems; i++)
    {
        var comp = app.project.item(i);

        if (!comp || !(comp instanceof CompItem) || comp.numLayers == 0)
        {
            continue;
        }
        
        for (var j = 1; j <= comp.numLayers; j++)
        {
            var layer = comp.layer(j);
            if (!layer)
            {
                continue;
            }
            
            collectExpressions(layer);
        }
    }
}

mainPalette = setUI();
mainPalette.center();
mainPalette.show();