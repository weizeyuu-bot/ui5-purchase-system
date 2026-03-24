sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.UserDetail", {

        onInit: function () {
            this._iUserIndex = -1;
            this._oEditSnapshot = null;

            this.getView().setModel(new JSONModel({ editMode: false }), "ui");

            // 将组件级 users 模型挂到视图，以便 bindElement 可以使用
            var oUsersModel = this.getOwnerComponent().getModel("users");
            this.getView().setModel(oUsersModel, "users");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteUserDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sUsername = oEvent.getParameter("arguments").username;
            try {
                sUsername = decodeURIComponent(sUsername || "");
            } catch (e) {
                sUsername = sUsername || "";
            }

            var oUsersModel = this.getOwnerComponent().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var iUserIndex = aUsers.findIndex(function (oItem) {
                return oItem.username === sUsername;
            });

            if (iUserIndex < 0) {
                MessageToast.show("未找到用户：" + sUsername);
                this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
                return;
            }

            this._iUserIndex = iUserIndex;
            this._oEditSnapshot = null;
            this.getView().getModel("ui").setProperty("/editMode", false);

            // 直接将视图绑定到 users 模型中对应行，数据自动显示
            this.getView().bindElement({
                path: "/registeredUsers/" + iUserIndex,
                model: "users"
            });
        },

        onEditUser: function () {
            var oUsersModel = this.getOwnerComponent().getModel("users");
            if (!oUsersModel || this._iUserIndex < 0) { return; }

            // 编辑前先快照，用于取消时恢复
            var oUser = oUsersModel.getProperty("/registeredUsers/" + this._iUserIndex);
            this._oEditSnapshot = Object.assign({}, oUser);
            this.getView().getModel("ui").setProperty("/editMode", true);
        },

        onCancelEdit: function () {
            if (this._oEditSnapshot && this._iUserIndex >= 0) {
                var oUsersModel = this.getOwnerComponent().getModel("users");
                oUsersModel.setProperty("/registeredUsers/" + this._iUserIndex, Object.assign({}, this._oEditSnapshot));
            }
            this.getView().getModel("ui").setProperty("/editMode", false);
            this._oEditSnapshot = null;
        },

        onSaveUser: function () {
            if (this._iUserIndex < 0) {
                MessageToast.show("保存失败：用户数据不存在");
                return;
            }

            var oUsersModel = this.getOwnerComponent().getModel("users");
            var oUser = oUsersModel.getProperty("/registeredUsers/" + this._iUserIndex);

            if (!oUser.email || !oUser.phone || !oUser.department || !oUser.role) {
                MessageToast.show("请完整填写邮箱、电话、部门和角色");
                return;
            }
            if (!this._isValidEmail(oUser.email)) {
                MessageToast.show("邮箱格式不正确");
                return;
            }
            if (!this._isValidPhone(oUser.phone)) {
                MessageToast.show("联系电话格式不正确");
                return;
            }

            // 更新状态颜色
            oUsersModel.setProperty("/registeredUsers/" + this._iUserIndex + "/statusState",
                this._mapStatusToState(oUser.status));

            this._refreshUserStatistics(oUsersModel);
            this._oEditSnapshot = null;
            this.getView().getModel("ui").setProperty("/editMode", false);
            MessageToast.show("保存成功");
        },

        _isValidEmail: function (sEmail) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(sEmail || "").trim());
        },

        _isValidPhone: function (sPhone) {
            return /^\d{7,15}$/.test(String(sPhone || "").trim());
        },

        _refreshUserStatistics: function (oUsersModel) {
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var iActive = aUsers.filter(function (oUser) {
                return oUser.status === "活跃";
            }).length;
            var iInactive = aUsers.filter(function (oUser) {
                return oUser.status === "不活跃";
            }).length;

            oUsersModel.setProperty("/statistics/totalUsers", aUsers.length);
            oUsersModel.setProperty("/statistics/activeUsers", iActive);
            oUsersModel.setProperty("/statistics/inactiveUsers", iInactive);
        },

        onStatusChange: function (oEvent) {
            var sStatus = oEvent.getSource().getSelectedKey();
            if (this._iUserIndex >= 0) {
                var oUsersModel = this.getOwnerComponent().getModel("users");
                oUsersModel.setProperty("/registeredUsers/" + this._iUserIndex + "/statusState",
                    this._mapStatusToState(sStatus));
            }
        },

        _mapStatusToState: function (sStatus) {
            if (sStatus === "活跃") {
                return "Success";
            }
            if (sStatus === "不活跃") {
                return "Warning";
            }
            if (sStatus === "禁用") {
                return "Error";
            }
            return "None";
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteUserManagement");
        }
    });
});