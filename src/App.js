var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{ html:'<a href="https://help.rallydev.com/apps/2.0rc2/doc/">App SDK 2.0rc2 Docs</a>'},
    
    _workItemType : 'defect',
    _workItemColumns : ['Name','Owner','State','Priority','PlanEstimate'],
    _workItemCustomField : "c_WorkItemID",

    launch: function() {
        //Write app code here
        app = this;
        app._createGrid();
    },

    _createGrid : function(scope) {

    	console.log("_createGrid");

        var filter = []; // app._createReleaseFilter(scope);

        if (filter) {
            app.showMask("Loading features...");
            Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
                // models: ['portfolioitem/feature'],
                models: [this._workItemType],
                autoLoad: true,
                enableHierarchy: true,
                filters : [filter]
            }).then({
                success: app._onStoreBuilt,
                scope: app
            });
        }
    },

    _onStoreBuilt: function(store) {
		console.log("_onStoreBuilt");
        if (this.grid) {
            this.remove(this.grid);
        }
        app._workItemColumns.push({
        	dataIndex : app._workItemCustomField,
        	hidden:true
        })
        app._workItemColumns.push(
        	{ 
        		header : 'Work Item ID',   
            	dataIndex : 'State', 
            	width : 70,
            	hidden : false,
    	        renderer : app.renderCustomColumn
            }
        );
        app._workItemColumns.push(
        	{ 
        		header : 'Work Item Name',   
            	dataIndex : 'State', 
            	width : 150,
            	hidden : false,
    	        renderer : app.renderWorkItemName
            }
        );

        this.grid = Ext.create('Rally.ui.grid.TreeGrid', {
	        xtype: 'rallytreegrid',
	        store: store,
	        context: app.getContext(),
	        enableEditing: false,
	        enableBulkEdit: false,
	        shouldShowRowActionsColumn: false,
	        enableRanking: false,
	        columnCfgs: app._workItemColumns
	    });
        this.add(this.grid);
    },

    renderCustomColumn : function(value,meta,r) {
      	var cWorkItemID = null;
      	// if (r.get("_type")=="portfolioitem/feature") {
        if (r.get("_WorkItem")) {
        	return r.get("_WorkItem").get("FormattedID");
        } else {
        	cWorkItemID = r.get(app._workItemCustomField);
        	if (cWorkItemID && cWorkItemID != "") {
	  			var itemId = Ext.id();
		        Ext.defer(app.readWorkItem,500, app, [value,itemId,r,cWorkItemID]);
		    }
	        return('');
        }
	},

	renderWorkItemName : function(value,meta,r) {
		if (r.get("_WorkItem")) {
        	return r.get("_WorkItem").get("Name");
        } else {
	        return('');
        }
	},

	getModelType : function(id) {
		var prefix = id.substr(0,1);

		if (prefix.toLowerCase()=="f") {
			return "PortfolioItem/Feature";
		} 
		if (prefix.toLowerCase()=="s") {
			return "HierarchicalRequirement";
		} 

		return "";

	},

	readWorkItem: function(value,itemId,rec,cWorkItemID) {

		app._loadAStoreWithAPromise(
			app.getModelType(cWorkItemID),
			["FormattedID","Name"],
			{property:"FormattedID",operator:"=",value:cWorkItemID}
		).then({
			success : function(records) {
				if (records && records.length>0) {
					rec.set("_WorkItem",_.first(records))
				}
			}
		})

	},

    showMask: function(msg) {
        if ( this.getEl() ) { 
            this.getEl().unmask();
            this.getEl().mask(msg);
        }
    },
    hideMask: function() {
        this.getEl().unmask();
    },

    _loadAStoreWithAPromise: function(model_name, model_fields, filters,ctx,order){
            var deferred = Ext.create('Deft.Deferred');
            var me = this;
              
            var config = {
                model: model_name,
                fetch: model_fields,
                filters: filters,
                limit: 'Infinity'
            };
            if (!_.isUndefined(ctx)&&!_.isNull(ctx)) {
                config.context = ctx;
            }
            if (!_.isUndefined(order)&&!_.isNull(order)) {
                config.order = order;
            }

            Ext.create('Rally.data.wsapi.Store', config ).load({
                callback : function(records, operation, successful) {
                    if (successful){
                        deferred.resolve(records);
                    } else {
                        deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                    }
                }
            });
            return deferred.promise;
    }
});
