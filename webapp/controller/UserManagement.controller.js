sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "myapp/model/apiClient"
], function (
    Controller,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    Label,
    Input,
    Select,
    Item,
    SimpleForm,
    JSONModel,
    Filter,
    FilterOperator,
    apiClient
) {
    "use strict";

    return Controller.extend("myapp.controller.UserManagement", {

        onInit: function () {
            var oUsersModel = this.getOwnerComponent().getModel("users");
            this.getView().setModel(oUsersModel, "users");

            this.getView().setModel(new JSONModel({
                pageTitle: this._getText("userManagementTitle"),
                selectedRoleId: "",
                permissionRows: []
            }), "vm");

            this._oUserDialog = null;
            this._oRoleDialog = null;

            this._syncUserRoleData();
            this._refreshUserStatistics();
            this._refreshRoleUserCounts();
            this._initDefaultRoleSelection();

            this.getOwnerComponent().getRouter()
                .getRoute("RouteUserManagement")
                .attachPatternMatched(this._onRouteMatched, this);

            this._loadUsersFromApi();
        },

        _onRouteMatched: function (oEvent) {
            var sTab = oEvent.getParameter("arguments").tab || "users";
            var oIconTabBar = this.byId("userMgmtTabBar");
            if (oIconTabBar && oIconTabBar.getSelectedKey() !== sTab) {
                oIconTabBar.setSelectedKey(sTab);
            }
            this._setPageTitleByTab(sTab);
            if (sTab === "permissions") {
                this._initDefaultRoleSelection();
            }
        },

        onTabSelect: function (oEvent) {
            var sTab = oEvent.getParameter("key") || "users";
            this._setPageTitleByTab(sTab);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sValue = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.byId("usersTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("username", FilterOperator.Contains, sValue),
                new Filter("email", FilterOperator.Contains, sValue),
                new Filter("phone", FilterOperator.Contains, sValue),
                new Filter("department", FilterOperator.Contains, sValue),
                new Filter("roleName", FilterOperator.Contains, sValue)
            ];

            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onRoleSearch: function (oEvent) {
            var sValue = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.byId("rolesTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("name", FilterOperator.Contains, sValue),
                new Filter("description", FilterOperator.Contains, sValue)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onAddUser: function () {
            this._openUserDialog("add");
        },

        onOpenUserDetail: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }
            var sUsername = oContext.getProperty("username");
            this.getOwnerComponent().getRouter().navTo("RouteUserDetail", {
                username: encodeURIComponent(sUsername)
            });
        },

        onEditUser: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }
            this._openUserDialog("edit", oContext.getObject());
        },

        onDeleteUser: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("users");
            if (!oContext) {
                return;
            }

            var that = this;
            var oUser = oContext.getObject();
            MessageBox.confirm(this._getText("userDeleteConfirm", [oUser.username]), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    if (!oUser.id) {
                        MessageToast.show(that._getText("userNotFound"));
                        return;
                    }

                    apiClient.request("/api/users/" + encodeURIComponent(oUser.id), {
                        method: "DELETE"
                    })
                    .then(function () {
                        MessageToast.show(that._getText("deleteSuccess"));
                        that._loadUsersFromApi();
                    })
                    .catch(function (oError) {
                        MessageToast.show(apiClient.getErrorMessage(oError, that._getText("deleteFailed")));
                    });
                }
            });
        },

        onAddRole: function () {
            this._openRoleDialog("add");
        },

        onEditRole: function () {
            var oRole = this._getSelectedRole();
            if (!oRole) {
                MessageToast.show(this._getText("roleSelectFirst"));
                return;
            }
            this._openRoleDialog("edit", oRole);
        },

        onDeleteRole: function () {
            var oRole = this._getSelectedRole();
            if (!oRole) {
                MessageToast.show(this._getText("roleSelectFirst"));
                return;
            }

            if ((oRole.userCount || 0) > 0) {
                MessageToast.show(this._getText("roleDeleteBlockedByUsers", [oRole.userCount]));
                return;
            }

            var that = this;
            MessageBox.confirm(this._getText("roleDeleteConfirm", [oRole.name]), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    var oUsersModel = that.getView().getModel("users");
                    var aRoles = oUsersModel.getProperty("/roles") || [];
                    var aNewRoles = aRoles.filter(function (oItem) {
                        return oItem.id !== oRole.id;
                    });
                    oUsersModel.setProperty("/roles", aNewRoles);
                    that._refreshRoleUserCounts();

                    var oVm = that.getView().getModel("vm");
                    oVm.setProperty("/selectedRoleId", "");
                    that._initDefaultRoleSelection();
                    MessageToast.show(that._getText("deleteSuccess"));
                }
            });
        },

        onRoleSelectionChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oRole = oItem && oItem.getBindingContext("users") && oItem.getBindingContext("users").getObject();
            if (!oRole) {
                return;
            }
            this.getView().getModel("vm").setProperty("/selectedRoleId", oRole.id);
            this._refreshPermissionRows();
        },

        onPermissionRoleChange: function (oEvent) {
            var sRoleId = oEvent.getParameter("selectedItem") ? oEvent.getParameter("selectedItem").getKey() : "";
            this.getView().getModel("vm").setProperty("/selectedRoleId", sRoleId);
            this._refreshPermissionRows();
        },

        onPermissionQueryChange: function (oEvent) {
            var bQuery = !!oEvent.getParameter("state");
            var sPath = oEvent.getSource().getBindingContext("vm").getPath();
            var oVm = this.getView().getModel("vm");

            oVm.setProperty(sPath + "/query", bQuery);
            if (!bQuery) {
                oVm.setProperty(sPath + "/operate", false);
            }
        },

        onPermissionOperateChange: function (oEvent) {
            var bOperate = !!oEvent.getParameter("state");
            var sPath = oEvent.getSource().getBindingContext("vm").getPath();
            var oVm = this.getView().getModel("vm");

            oVm.setProperty(sPath + "/operate", bOperate);
            if (bOperate) {
                oVm.setProperty(sPath + "/query", true);
            }
        },

        onSavePermissions: function () {
            var oVm = this.getView().getModel("vm");
            var sRoleId = oVm.getProperty("/selectedRoleId");
            if (!sRoleId) {
                MessageToast.show(this._getText("roleSelectFirst"));
                return;
            }

            var oUsersModel = this.getView().getModel("users");
            var aRoles = oUsersModel.getProperty("/roles") || [];
            var iRoleIndex = aRoles.findIndex(function (oRole) {
                return oRole.id === sRoleId;
            });
            if (iRoleIndex < 0) {
                MessageToast.show(this._getText("roleNotFound"));
                return;
            }

            var aRows = oVm.getProperty("/permissionRows") || [];
            var oPermissions = {};
            aRows.forEach(function (oRow) {
                oPermissions[oRow.module] = {
                    query: !!oRow.query,
                    operate: !!oRow.operate
                };
            });

            aRoles[iRoleIndex] = Object.assign({}, aRoles[iRoleIndex], {
                permissions: oPermissions
            });
            oUsersModel.setProperty("/roles", aRoles);
            MessageToast.show(this._getText("saveSuccess"));
        },

        _openUserDialog: function (sMode, oUser) {
            var that = this;
            var bEditMode = sMode === "edit";
            var oDialogModel = new JSONModel({
                mode: sMode,
                id: bEditMode ? (oUser.id || "") : "",
                username: bEditMode ? oUser.username : "",
                password: "",
                email: bEditMode ? (oUser.email || "") : "",
                phone: bEditMode ? (oUser.phone || "") : "",
                department: bEditMode ? (oUser.department || "") : "",
                roleId: bEditMode ? (oUser.roleId || "") : "",
                status: bEditMode ? (oUser.status || "") : ""
            });

            if (!this._oUserDialog) {
                this._oUserDialog = new Dialog({
                    title: that._getText("userInfoDialogTitle"),
                    contentWidth: "460px",
                    content: [
                        new SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            emptySpanL: 0,
                            emptySpanM: 0,
                            columnsL: 1,
                            columnsM: 1,
                            content: [
                                new Label({ text: that._getText("username") }),
                                new Input({
                                    value: "{dialog>/username}",
                                    editable: "{= ${dialog>/mode} === 'add' }"
                                }),
                                new Label({ text: that._getText("password") }),
                                new Input({
                                    value: "{dialog>/password}",
                                    type: "Password",
                                    placeholder: "{= ${dialog>/mode} === 'add' ? '' : '******' }"
                                }),
                                new Label({ text: that._getText("userEmail") }),
                                new Input({ value: "{dialog>/email}" }),
                                new Label({ text: that._getText("userPhone") }),
                                new Input({ value: "{dialog>/phone}" }),
                                new Label({ text: that._getText("department") }),
                                new Input({ value: "{dialog>/department}" }),
                                new Label({ text: that._getText("role") }),
                                new Select({
                                    selectedKey: "{dialog>/roleId}",
                                    forceSelection: false,
                                    items: {
                                        path: "users>/roles",
                                        template: new Item({ key: "{users>id}", text: "{users>name}" })
                                    }
                                }),
                                new Label({ text: that._getText("status") }),
                                new Select({
                                    selectedKey: "{dialog>/status}",
                                    forceSelection: false,
                                    items: [{ key: "", textKey: "pleaseSelect" }].concat(
                                        (that.getOwnerComponent().getModel("statusOptions").getProperty("/userStatus") || [])
                                    ).map(function (oOpt) {
                                        return new Item({ key: oOpt.key, text: that._getText(oOpt.textKey) });
                                    })
                                })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: that._getText("saveButton"),
                        type: "Emphasized",
                        press: function () {
                            that._onSaveDialogUser();
                        }
                    }),
                    endButton: new Button({
                        text: that._getText("cancelButton"),
                        press: function () {
                            that._oUserDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._oUserDialog);
            }

            this._oUserDialog.setModel(oDialogModel, "dialog");
            this._oUserDialog.open();
        },

        _onSaveDialogUser: function () {
            var oDialogModel = this._oUserDialog.getModel("dialog");
            var oData = Object.assign({}, oDialogModel.getData());
            var sBackendRole = this._mapRoleIdToBackendRole(oData.roleId);
            var oPayload;

            if (!oData.username || !oData.roleId || !oData.status) {
                MessageToast.show(this._getText("userAllFieldsRequired"));
                return;
            }

            if (!sBackendRole) {
                MessageToast.show(this._getText("roleNotFound"));
                return;
            }

            if (oData.mode === "add") {
                if (!oData.password || String(oData.password).length < 6) {
                    MessageToast.show(this._getText("passwordMinLength"));
                    return;
                }

                oPayload = {
                    username: oData.username,
                    name: oData.username,
                    password: oData.password,
                    role: sBackendRole,
                    status: oData.status
                };

                apiClient.request("/api/users", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oPayload)
                })
                .then(function () {
                    MessageToast.show(this._getText("createSuccess"));
                    this._oUserDialog.close();
                    this._loadUsersFromApi();
                }.bind(this))
                .catch(function (oError) {
                    MessageToast.show(apiClient.getErrorMessage(oError, this._getText("createFailed")));
                }.bind(this));
                return;
            }

            if (!oData.id) {
                MessageToast.show(this._getText("userNotFound"));
                return;
            }

            oPayload = {
                name: oData.username,
                role: sBackendRole,
                status: oData.status
            };

            if (oData.password && String(oData.password).length >= 6) {
                oPayload.password = oData.password;
            }

            apiClient.request("/api/users/" + encodeURIComponent(oData.id), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oPayload)
            })
            .then(function () {
                MessageToast.show(this._getText("saveSuccess"));
                this._oUserDialog.close();
                this._loadUsersFromApi();
            }.bind(this))
            .catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getText("saveFailed")));
            }.bind(this));
        },

        _loadUsersFromApi: function () {
            var oUsersModel = this.getView().getModel("users");
            if (!oUsersModel) {
                return;
            }

            apiClient.request("/api/users")
                .then(function (aUsers) {
                    var aMapped = (Array.isArray(aUsers) ? aUsers : []).map(function (oItem) {
                        return this._toUiUser(oItem);
                    }, this);

                    oUsersModel.setProperty("/registeredUsers", aMapped);
                    this._syncUserRoleData();
                    this._refreshUserStatistics();
                    this._refreshRoleUserCounts();
                    this._refreshPermissionRows();
                }.bind(this))
                .catch(function (oError) {
                    MessageToast.show(apiClient.getErrorMessage(oError, this._getText("loadFailed")));
                }.bind(this));
        },

        _toUiUser: function (oApiUser) {
            var sRoleId = this._mapBackendRoleToRoleId(oApiUser.role);
            var sRoleName = this._getRoleNameById(sRoleId) || oApiUser.role || "";
            var sDate = "";

            if (oApiUser.createdAt) {
                sDate = String(oApiUser.createdAt).slice(0, 10);
            }

            return {
                id: oApiUser.id,
                username: oApiUser.username,
                email: "-",
                phone: "-",
                registrationDate: sDate || this._todayString(),
                status: oApiUser.status || "ACTIVE",
                statusState: this._mapStatusToState(oApiUser.status),
                department: "-",
                roleId: sRoleId,
                roleName: sRoleName,
                role: sRoleName,
                lastLogin: "-",
                loginCount: 0,
                createdBy: this._getCurrentOperator()
            };
        },

        _mapBackendRoleToRoleId: function (sRole) {
            if (sRole === "ADMIN") {
                return "ROLE_ADMIN";
            }
            return "ROLE_BUYER";
        },

        _mapRoleIdToBackendRole: function (sRoleId) {
            if (sRoleId === "ROLE_ADMIN") {
                return "ADMIN";
            }
            return "USER";
        },

        _openRoleDialog: function (sMode, oRole) {
            var that = this;
            var bEditMode = sMode === "edit";
            var oDialogModel = new JSONModel({
                mode: sMode,
                id: bEditMode ? oRole.id : "",
                name: bEditMode ? (oRole.name || "") : "",
                description: bEditMode ? (oRole.description || "") : ""
            });

            if (!this._oRoleDialog) {
                this._oRoleDialog = new Dialog({
                    title: that._getText("roleDialogTitle"),
                    contentWidth: "460px",
                    content: [
                        new SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            emptySpanL: 0,
                            emptySpanM: 0,
                            columnsL: 1,
                            columnsM: 1,
                            content: [
                                new Label({ text: that._getText("roleCode") }),
                                new Input({ value: "{dialog>/id}", editable: false, placeholder: that._getText("autoGenerated") }),
                                new Label({ text: that._getText("roleName") }),
                                new Input({ value: "{dialog>/name}" }),
                                new Label({ text: that._getText("roleDescription") }),
                                new Input({ value: "{dialog>/description}" })
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: that._getText("saveButton"),
                        type: "Emphasized",
                        press: function () {
                            that._onSaveDialogRole();
                        }
                    }),
                    endButton: new Button({
                        text: that._getText("cancelButton"),
                        press: function () {
                            that._oRoleDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._oRoleDialog);
            }

            this._oRoleDialog.setModel(oDialogModel, "dialog");
            this._oRoleDialog.open();
        },

        _onSaveDialogRole: function () {
            var oDialogModel = this._oRoleDialog.getModel("dialog");
            var oData = Object.assign({}, oDialogModel.getData());
            var oUsersModel = this.getView().getModel("users");
            var aRoles = oUsersModel.getProperty("/roles") || [];

            if (!oData.name || !oData.description) {
                MessageToast.show(this._getText("roleFieldsRequired"));
                return;
            }

            if (oData.mode === "add") {
                var sNewId = this._generateRoleId(aRoles);
                aRoles.push({
                    id: sNewId,
                    name: oData.name,
                    description: oData.description,
                    userCount: 0,
                    permissions: this._buildDefaultPermissions()
                });
                oUsersModel.setProperty("/roles", aRoles);
                this.getView().getModel("vm").setProperty("/selectedRoleId", sNewId);
                MessageToast.show(this._getText("createSuccess"));
            } else {
                var iRoleIndex = aRoles.findIndex(function (oRole) {
                    return oRole.id === oData.id;
                });
                if (iRoleIndex < 0) {
                    MessageToast.show(this._getText("roleNotFound"));
                    return;
                }

                aRoles[iRoleIndex] = Object.assign({}, aRoles[iRoleIndex], {
                    name: oData.name,
                    description: oData.description
                });
                oUsersModel.setProperty("/roles", aRoles);
                this._syncUserRoleData();
                MessageToast.show(this._getText("saveSuccess"));
            }

            this._refreshRoleUserCounts();
            this._refreshPermissionRows();
            this._oRoleDialog.close();
        },

        _refreshPermissionRows: function () {
            var oUsersModel = this.getView().getModel("users");
            var oVm = this.getView().getModel("vm");
            var sRoleId = oVm.getProperty("/selectedRoleId");
            var oRole = this._getRoleById(sRoleId);
            var aCatalog = oUsersModel.getProperty("/permissionCatalog") || [];

            if (!oRole) {
                oVm.setProperty("/permissionRows", []);
                return;
            }

            var oPermissions = oRole.permissions || {};
            var sLastGroupKey = "";
            var aRows = aCatalog
                .filter(function (oModule) { return !!oModule.module && !!oModule.moduleName; })
                .map(function (oModule) {
                    var oAuth = oPermissions[oModule.module] || { query: false, operate: false };
                    var sGroupKey = oModule.groupKey || "";
                    var sGroupName = sGroupKey && sGroupKey !== sLastGroupKey ? this._getText(sGroupKey) : "";

                    sLastGroupKey = sGroupKey;

                    return {
                        module: oModule.module,
                        groupName: sGroupName,
                        moduleName: oModule.moduleName,
                        query: !!oAuth.query,
                        operate: !!oAuth.operate
                    };
                }, this);
            oVm.setProperty("/permissionRows", aRows);
        },

        _setPageTitleByTab: function (sTab) {
            var mTitleKey = {
                users: "userManagementTitle",
                roles: "menuRoleManagement",
                permissions: "menuPermissionManagement"
            };
            this.getView().getModel("vm").setProperty(
                "/pageTitle",
                this._getText(mTitleKey[sTab] || "userManagementTitle")
            );
        },

        _syncUserRoleData: function () {
            var oUsersModel = this.getView().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var aRoles = oUsersModel.getProperty("/roles") || [];
            var sFallbackRoleId = aRoles[0] ? aRoles[0].id : "";

            aUsers.forEach(function (oUser) {
                if (!oUser.roleId || !this._getRoleById(oUser.roleId)) {
                    var oRoleByName = aRoles.find(function (oRole) {
                        return oRole.name === oUser.role || oRole.name === oUser.roleName;
                    });
                    oUser.roleId = oRoleByName ? oRoleByName.id : sFallbackRoleId;
                }

                oUser.roleName = this._getRoleNameById(oUser.roleId) || oUser.roleName || "";
                oUser.role = oUser.roleName;
                oUser.statusState = this._mapStatusToState(oUser.status);
            }, this);

            oUsersModel.setProperty("/registeredUsers", aUsers);
        },

        _refreshUserStatistics: function () {
            var oUsersModel = this.getView().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var oNow = new Date();
            var sMonthPrefix = oNow.getFullYear() + "-" + String(oNow.getMonth() + 1).padStart(2, "0");
            var iActive = aUsers.filter(function (oUser) {
                return oUser.status === "ACTIVE";
            }).length;
            var iInactive = aUsers.filter(function (oUser) {
                return oUser.status === "INACTIVE";
            }).length;
            var iNewThisMonth = aUsers.filter(function (oUser) {
                return typeof oUser.registrationDate === "string" && oUser.registrationDate.indexOf(sMonthPrefix) === 0;
            }).length;

            oUsersModel.setProperty("/statistics/totalUsers", aUsers.length);
            oUsersModel.setProperty("/statistics/activeUsers", iActive);
            oUsersModel.setProperty("/statistics/inactiveUsers", iInactive);
            oUsersModel.setProperty("/statistics/thisMonthNewUsers", iNewThisMonth);
        },

        _refreshRoleUserCounts: function () {
            var oUsersModel = this.getView().getModel("users");
            var aUsers = oUsersModel.getProperty("/registeredUsers") || [];
            var aRoles = oUsersModel.getProperty("/roles") || [];

            var mCount = {};
            aUsers.forEach(function (oUser) {
                if (oUser.roleId) {
                    mCount[oUser.roleId] = (mCount[oUser.roleId] || 0) + 1;
                }
            });

            aRoles = aRoles.map(function (oRole) {
                return Object.assign({}, oRole, {
                    userCount: mCount[oRole.id] || 0
                });
            });
            oUsersModel.setProperty("/roles", aRoles);
        },

        _initDefaultRoleSelection: function () {
            var oVm = this.getView().getModel("vm");
            var sSelectedRoleId = oVm.getProperty("/selectedRoleId");
            if (sSelectedRoleId && this._getRoleById(sSelectedRoleId)) {
                this._refreshPermissionRows();
                return;
            }

            var aRoles = this.getView().getModel("users").getProperty("/roles") || [];
            oVm.setProperty("/selectedRoleId", aRoles[0] ? aRoles[0].id : "");
            this._refreshPermissionRows();
        },

        _getSelectedRole: function () {
            var oTable = this.byId("rolesTable");
            var oItem = oTable && oTable.getSelectedItem();
            var oContext = oItem && oItem.getBindingContext("users");
            return oContext ? oContext.getObject() : null;
        },

        _getRoleById: function (sRoleId) {
            var aRoles = this.getView().getModel("users").getProperty("/roles") || [];
            return aRoles.find(function (oRole) {
                return oRole.id === sRoleId;
            }) || null;
        },

        _getRoleNameById: function (sRoleId) {
            var oRole = this._getRoleById(sRoleId);
            return oRole ? oRole.name : "";
        },

        _buildDefaultPermissions: function () {
            var aCatalog = this.getView().getModel("users").getProperty("/permissionCatalog") || [];
            var oPermissions = {};
            aCatalog.forEach(function (oModule) {
                oPermissions[oModule.module] = { query: false, operate: false };
            });
            return oPermissions;
        },

        _generateRoleId: function (aRoles) {
            var i = (aRoles || []).length + 1;
            var sId = "ROLE_CUSTOM_" + String(i).padStart(3, "0");
            while ((aRoles || []).some(function (oRole) { return oRole.id === sId; })) {
                i += 1;
                sId = "ROLE_CUSTOM_" + String(i).padStart(3, "0");
            }
            return sId;
        },

        _isValidEmail: function (sEmail) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(sEmail || "").trim());
        },

        _isValidPhone: function (sPhone) {
            return /^\d{7,15}$/.test(String(sPhone || "").trim());
        },

        _mapStatusToState: function (sStatus) {
            if (sStatus === "ACTIVE") {
                return "Success";
            }
            if (sStatus === "INACTIVE") {
                return "Warning";
            }
            if (sStatus === "DISABLED") {
                return "Error";
            }
            return "None";
        },

        formatUserStatusText: function (sStatus) {
            var mKey = {
                ACTIVE: "statusActive",
                INACTIVE: "statusInactive",
                DISABLED: "statusDisabled"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        _todayString: function () {
            var oDate = new Date();
            var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
            var sDay = String(oDate.getDate()).padStart(2, "0");
            return oDate.getFullYear() + "-" + sMonth + "-" + sDay;
        },

        _getCurrentOperator: function () {
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oCurrentUser = oUserModel && oUserModel.getProperty("/currentUser");
            return (oCurrentUser && oCurrentUser.username) || "admin";
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});