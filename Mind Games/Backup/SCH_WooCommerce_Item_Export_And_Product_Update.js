/** NetScore Technologies
 ** 8300 Boone Boulevard, Suite 500
 ** Vienna, VA 22182
 ** Phone 703-599-9282
 ** All Rights Reserved.
 **
 ** This code is the confidential and proprietary information of
 ** NetScore Technologies Private Limited ("Confidential Information"). You shall not
 ** disclose such Confidential Information and shall use it only in
 ** accordance with the terms of the license agreement you entered into
 ** with NetScore.
 **
 ** @Client: WooCommerce
 ** @author: Mahesh Bonagiri
 ** @dated: 04-16-2021
 ** @Script Name: SCH_WooCommerce_Item_Export_And_Update.js
 ** @Description: This script is for exporting matrix items(variable & variations) & inventory items(simple) only.
 ** @NApiVersion 2.x
 ** @NScriptType ScheduledScript
 ** @NModuleScope SameAccount
 **
 ** @libraries used:
1.libraries file name and its used

	-- Date--      -- Modified By--      --Requested By--     --Change Request(Issues, New Functionality, Changes)
	DD-MM-YYYY        Employee Name					Client Name			  								One line description

 */
define(['N/search', 'N/log', 'N/record', 'N/runtime', 'N/https', 'N/task', 'N/file', './LIB_NetScore_WooCommerce_License_Validator', './LIB_WooCommerce_Item_Export_And_Update'],
    function (search, log, record, runtime, https, task, file, LIB_NetScore_License_Validator, LIB_WooCommerce_Item_Export_And_Update) {
        function execute(scriptContext) {
            var itemRecId = 0;
            var item_type = 0;
            try {
                const startTime = Number(new Date().getTime());
                log.debug('WooCommerce Item Export Script', 'WooCommerce Item Export Schedule Script Begins');

                var scriptObj = runtime.getCurrentScript();
                log.debug({
                    title: 'Remaining Usage',
                    details: 'Remaining Governance Units At START: ' + scriptObj.getRemainingUsage()
                });

                var setupRecId = scriptObj.getParameter({
                    name: 'custscript_woo_setup_record_id'
                });
                var itemExportorUpdateSearch = scriptObj.getParameter({
                    name: 'custscript_saved_search'
                });
                log.debug({
                    title: 'Script Parameters',
                    details: 'Setup Record Id: ' + setupRecId + ' ,SS Id: ' + itemExportorUpdateSearch
                });

                var breakLoop = 0; { //Getting Setup record values
                    var sr_LookupFields = [
                        'custrecord_ns_woo_export_items',
                        'custrecord_ns_woo_upd_woo_product',
                        'custrecord_ns_woo_woocommerce_api_url',
                        'custrecord_ns_woo_consumer_key',
                        'custrecord_ns_woo_consumer_secret',
                        'custrecord_ns_woo_sandbox_account',
                        'custrecord_ns_woo_production_account',
                        'custrecord_ns_woo_product_code',
                        'custrecord_ns_woo_item_sku_field_id',
                        'custrecord_ns_woo_reg_price_lvl',
                        'custrecord_ns_woo_sale_price_lvl',
                        'custrecord_ns_woo_export_images',
                        'custrecord_ns_woo_item_location'
                    ];
                    var setupRecObj = search.lookupFields({
                        type: 'customrecord_woocommerce_connector_setup',
                        id: setupRecId,
                        columns: sr_LookupFields
                    });
                    log.audit('Setup Record Lookup Object', setupRecObj);

                    var itemExport = setupRecObj.custrecord_ns_woo_export_items;
                    var productUpdate = setupRecObj.custrecord_ns_woo_upd_woo_product;
                    var sEnv = setupRecObj.custrecord_ns_woo_sandbox_account;
                    var pEnv = setupRecObj.custrecord_ns_woo_production_account;
                    //Licence Code
                    if (false) {
                        var sr_productCode = setupRecObj.custrecord_ns_woo_product_code;
                        log.debug({
                            title: 'Setup Record Load Block',
                            details: "Product Code: " + sr_productCode
                        });
                        if (!LIB_NetScore_License_Validator.validateLicense(sr_productCode)) {
                            log.audit({
                                title: 'License.',
                                details: "Your license has expired. Please renew your license."
                            });
                            return false;
                        }
                    }
                    if ((runtime.envType == 'PRODUCTION' && pEnv != true) || (runtime.envType == 'SANDBOX' && sEnv != true)) {
                        log.error('Script Exiting...', 'Script execution environment differs from setup record.');
                        return false;
                    }
                    if (!productUpdate && !itemExport) {
                        log.audit('Script Exiting...', 'Script Terminated Due to both Product Update & Item Export Check Boxs are Unchecked ');
                        return false;
                    }
                } //Getting Setup record values
                if (itemExportorUpdateSearch) {
                    var mySearch = search.load({
                        id: itemExportorUpdateSearch
                    }); //1162
                    var pagedData = mySearch.runPaged({
                        pageSize: 1000
                    });
                    log.debug('Item Export Script', 'No of results: ' + pagedData.count + ' No of pages: ' + pagedData.pageRanges.length);
                    count = 1;
                    if (pagedData.pageRanges.length > 0) {
                         for( var i = 0; i < pagedData.pageRanges.length; i++){
                        //for (var i = 0; i < 1; i++) {
                            var currentPage = pagedData.fetch(i);
                            currentPage.data.forEach(function (result) {
                                //if(i == 6) breakLoop = 1; //*inhibitor*
                                if (breakLoop < 1) {
                                    log.debug('Remaining Usage', 'Remaining Governance Units At Start Of Export Item Process: ' + scriptObj.getRemainingUsage());
                                    itemRecId = result.id;
                                    item_type = result.getValue({
                                        name: mySearch.columns[0]
                                    });
                                    log.debug('ItemExportScript', 'Item Record Id: ' + itemRecId + ', Item Type: ' + item_type + ' Count: ' + count);

                                    if (item_type == 'InvtPart' || item_type == 'inventoryitem' || item_type == 'Kit' || item_type == 'kititem') {

                                        //setProcessInProgress(itemRecId, true);

                                        //itemExportproductUpdate(contextType,itemRecObj,setupRecObj,item_type, setupRecId, variableId, nsVariationAttr)
                                        var exportItemResponse = LIB_WooCommerce_Item_Export_And_Update.itemExportproductUpdate(result, setupRecObj, item_type, setupRecId, 0, 0);
                                        if (!isNaN(exportItemResponse)) {
                                            log.debug({
                                                title: 'Ns Product Exported/Updated Success',
                                                details: 'Ns Item exported/Updated With Woo Item Id: ' + exportItemResponse
                                            });
                                        } else {
                                            log.error({
                                                title: 'Ns Product Exported/Updated Error',
                                                details: 'Ns Item Export/Update With An Error Details: ' + exportItemResponse
                                            });
                                        }
                                        //setProcessInProgress(itemRecId, false);
                                        var remainingUsage = scriptObj.getRemainingUsage();
                                        var endTime = Number(new Date().getTime());
                                        var timeDiff = endTime - startTime;
                                        var min = Math.floor((timeDiff / 1000 / 60) << 0);
                                        log.debug({
                                            title: 'Time Difference',
                                            details: 'Start Time: ' + startTime + ' End Time: ' + endTime + ' Time Differece: ' + timeDiff + ' minutes:' + min
                                        })
                                        if (remainingUsage < 1500 || min > 45) {
                                            log.debug('Item Export Script', 'Remaining Usage At End Of Export Item Process: ' + remainingUsage);
                                            log.debug('Item Export Script', 'Last Exported Item Record Id: ' + itemRecId + ' Count: ' + count);

                                            var scheduleScriptTaskObj = task.create({
                                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                                scriptId: runtime.getCurrentScript().id,
                                                deploymentId: runtime.getCurrentScript().deploymentId,
                                            });
                                            scheduleScriptTaskObj.submit();
                                            breakLoop = 1;
                                        }
                                        //if(count >= 1) breakLoop = 1; //*inhibitor*
                                        count++;
                                    } else {
                                        log.debug('Script Terminated..', 'NetSuite Product Type is not defined. Please chech and update it in the script.')
                                    }
                                } //if(breakLoop<1)
                            }); //currentPage.data.forEach( function(result)
                        } //for( var i=0; i < pagedData.pageRanges.length; i++ )
                    } //if(pagedData.pageRanges.length > 0)
                    log.debug('Item Export Script', 'No of items exported: ' + Number(count - 1));
                    log.debug('Item Export Script', 'Remaining Governance Units At End: ' + scriptObj.getRemainingUsage());
                } //if(consumerKey && consumerSecret && apiUrl && itemExportorUpdateSearch && Number(licenceDays) > 0)
            } catch (e) {
               
                log.error({
                    title: 'Catch Block: Error',
                    details: 'Error Name: ' + e.name + ',\nError Message: ' + e.message
                });
                log.error({
                    title: 'Catch Block: Error: RAW',
                    details: JSON.stringify(e)
                });

            } finally {
                log.debug('Finally: Remaining Usage', 'Remaining Governance Units At End: ' + scriptObj.getRemainingUsage());
                log.debug('WooCommerce Item Export Script', 'WooCommerce Item Export Schedule Script Ends');
            }

        } //function execute(scriptContext)
        /* function setProcessInProgress(itemRecId, booleanValue) {
            try {
                var parentRecordId = record.submitFields({
                    type: record.Type.INVENTORY_ITEM,
                    id: itemRecId,
                    values: {
                        'custitem_woo_process_in_progress': booleanValue
                    }
                });
            } catch (e) {
                try {
                    var parentRecordId = record.submitFields({
                        type: record.Type.SERIALIZED_INVENTORY_ITEM,
                        id: itemRecId,
                        values: {
                            'custitem_woo_process_in_progress': booleanValue
                        }
                    });
                } catch (e) {
                    try {
                        var parentRecordId = record.submitFields({
                            type: record.Type.LOT_NUMBERED_INVENTORY_ITEM,
                            id: itemRecId,
                            values: {
                                'custitem_woo_process_in_progress': booleanValue
                            }
                        });
                    } catch (e) {
                        try {
                            var parentRecordId = record.submitFields({
                                type: record.Type.ITEM_GROUP,
                                id: itemRecId,
                                values: {
                                    'custitem_woo_process_in_progress': booleanValue
                                }
                            });
                        } catch (e) {
                            try {
                                var parentRecordId = record.submitFields({
                                    type: record.Type.KIT_ITEM,
                                    id: itemRecId,
                                    values: {
                                        'custitem_woo_process_in_progress': booleanValue
                                    }
                                });
                            } catch (e) {
                                log.error({
                                    title: 'Catch Block: Record Load Error',
                                    details: 'Error Name: ' + e.name + ', \nError Details: ' + e.message
                                });
                                log.debug({
                                    title: 'Error in loading record',
                                    details: 'Error Item Record Id: ' + itemRecId
                                });
                            }
                        }
                    }
                }
            }
        } */
        return {
            execute: execute
        };
    });