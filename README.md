# AE Expression CN Fix
AE表达式修复工具: 解决AE英文模板中的表达式在中文环境下报错的修复插件

## 安装
1. 下载插件文件 `表达式修复 AE Expression CN Fix.jsx`
2. 将文件复制到 After Effects 的Scripts\ScriptUI Panels目录：
   - Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
   - macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
3. 重启 After Effects

## 使用
1. 打开 After Effects
2. 在菜单栏选择 `窗口 > 表达式修复 AE Expression CN Fix` 打开插件面板
3. 在项目窗口选中需要修复表达式的预合成
4. 点击插件界面中的 `修复表达式` 按钮
5. 插件会自动修复选中预合成中的所有表达式

## 注意事项
- 请确保在使用插件前备份项目文件，以防止意外情况导致数据丢失。
- 插件仅修复表达式中的中文字符问题，其他类型的表达式错误可能需要手动修复。
- 如果遇到任何问题，请联系插件开发者获取支持或者提交问题到邮箱：ahang@silky.site

## 许可证
本插件遵循 MIT 许可证，详情请参阅 LICENSE 文件。

## 如何编写插件
需要安装的vscode插件：
- ExtendScript（语法支持）
- ExtendScript Debugger（调试支持）
只有把文件放在Scripts\ScriptUI Panels目录下，才能以面板模式在After Effects中运行
如果是调试运行则只能以窗口模式运行