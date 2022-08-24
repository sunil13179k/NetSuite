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
** @client: WooCommerce BFN
** @author: MAHESH BONAGIRI/Gnanadeep Nekkanti
** @dated: 20-08-2019
** @Script Name: SCH_WooCommerce_Update_Price_Inventory_Non_Variation.js
** @Description: This script updates price and inventory of non-variations only.
** @NApiVersion 2.x
** @NScriptType ScheduledScript
** @NModuleScope SameAccount
**
** @libraries used:
1.libraries file name and its used

-- Date--      -- Modified By--      --Requested By--     --Change Request(Issues, New Functionality, Changes)
DD-MM-YYYY        Employee Name			Client Name			  One line description

*/

define(['N/search', 'N/log', 'N/record', 'N/runtime', 'N/https', 'N/task', 'N/file', './LIB_WooCommerce_Item_Export_And_Update'],
	function (search, log, record, runtime, https, task, file, LIB_WooCommerce_Item_Export_And_Update) {
		function execute(scriptContext) {
			try {
				log.error({
					title: 'Scheduled Script',
					details: 'Scheduled script for Price & Inventory Update of Non Variations Begins'
				});

				//script parameters
				var scriptObj = runtime.getCurrentScript();
				var sp_DeploymentId = scriptObj.deploymentId;
				var sp_SetupRecId = scriptObj.getParameter({
					name: 'custscript_woo_upi_nvar_setup_rec'
				});
				var sp_LastUpdItemId = Number(scriptObj.getParameter({
					name: 'custscript_woo_upi_nvar_last_upd_item_id'
				}));
				var sp_PriceInvtSSId = scriptObj.getParameter({
					name: 'custscript_woo_upi_nvar_item_ss'
				});
				var sp_PriceUpdChk = scriptObj.getParameter({
					name: 'custscript_woo_upi_nvar_upd_price'
				});
				var sp_InvtUpdChk = scriptObj.getParameter({
					name: 'custscript_woo_upi_nvar_upd_invt'
				});
				log.debug('Script Parameters', 'Setup Record Id: ' + sp_SetupRecId + ', Last Updated Item Id: ' + sp_LastUpdItemId + ', Saved Search Id: ' + sp_PriceInvtSSId);

				if (!sp_PriceUpdChk && !sp_InvtUpdChk) {
					log.audit('Script Exiting...', 'Price & Invt Update Script Parameter CheckBoxes set to false.');
					return false;
				} //if( !sp_PriceUpdChk && !sp_InvtUpdChk )

				//list of field ids
				var sr_LookupFields = [
					'custrecord_ns_woo_scripts_folder_id',
					'custrecord_ns_woo_scripts_error_file',
					'custrecord_ns_woo_sandbox_account',
					'custrecord_ns_woo_production_account',
					'custrecord_ns_woo_update_price',
					'custrecord_ns_woo_consumer_key',
					'custrecord_ns_woo_consumer_secret',
					'custrecord_ns_woo_woocommerce_api_url',
					'custrecord_ns_woo_nvar_pr_inv_upd_search',
					'custrecord_ns_woo_update_inventory',
					'custrecord_ns_woo_reg_price_lvl',
					'custrecord_ns_woo_sale_price_lvl'
				];

				var sr_LookupResObj = search.lookupFields({
					type: 'customrecord_woocommerce_connector_setup',
					id: sp_SetupRecId,
					columns: sr_LookupFields
				});
				log.debug('Setup Record Lookup Object', sr_LookupResObj);

				//Retrieve field values
				var sr_ScriptsFolderId = sr_LookupResObj.custrecord_ns_woo_scripts_folder_id;
				var sr_ScriptsErrorFileId = sr_LookupResObj.custrecord_ns_woo_scripts_error_file[0].value;
				var sr_SandBoxEnv = sr_LookupResObj.custrecord_ns_woo_sandbox_account;
				var sr_ProdEnv = sr_LookupResObj.custrecord_ns_woo_production_account;
				var sr_PriceUpdChk = sr_LookupResObj.custrecord_ns_woo_update_price;
				var sr_InvtUpdChk = sr_LookupResObj.custrecord_ns_woo_update_inventory;
				var sr_ConsumerKey = sr_LookupResObj.custrecord_ns_woo_consumer_key;
				var sr_ConsumerSecret = sr_LookupResObj.custrecord_ns_woo_consumer_secret;
				var sr_ApiUrl = sr_LookupResObj.custrecord_ns_woo_woocommerce_api_url;
				var salePriceLvl = '';
				if (sr_LookupResObj.custrecord_ns_woo_sale_price_lvl[0])
					salePriceLvl = sr_LookupResObj.custrecord_ns_woo_sale_price_lvl[0].text;

				var regPriceLvl = '';
				if (sr_LookupResObj.custrecord_ns_woo_reg_price_lvl[0])
					regPriceLvl = sr_LookupResObj.custrecord_ns_woo_reg_price_lvl[0].text;

				var sr_LicenceDays = 25; //sr_LookupResObj.custrecord_ns_woo_licence_days;

				if ((runtime.envType == 'PRODUCTION' && sr_ProdEnv != true) || (runtime.envType == 'SANDBOX' && sr_SandBoxEnv != true)) {
					log.audit('Script Exiting...', 'Script execution environment differs from setup record.');
					return false;
				} //if( (runtime.envType == 'PRODUCTION' && sr_ProdEnv != true) || (runtime.envType == 'SANDBOX' && sr_SandBoxEnv != true))

				if (!sr_PriceUpdChk && !sr_InvtUpdChk) {
					log.audit('Script Exiting...', 'Price & Invt Update Setup Record CheckBoxes set to false.');
					return false;
				} //if( !sr_PriceUpdChk && !sr_InvtUpdChk )

				if (sr_ConsumerKey && sr_ConsumerSecret && sr_ApiUrl && sp_PriceInvtSSId && Number(sr_LicenceDays) > 0) {
					var batchUpdateObj = {};
					var batchProdsUpdArray = [];

					var header = [];
					header['Content-Type'] = 'application/json';

					//Load item saved search
					var searchObj = search.load({
						id: sp_PriceInvtSSId
					});
					//log.debug( 'Saved Search', 'Saved Search Object: ' + JSON.stringify( searchObj ) );

					if (!searchObj)
						return false;

					if (sp_LastUpdItemId > 0) {
						var ss_ItemIDFilter = search.createFilter({
							name: 'internalidnumber',
							operator: search.Operator.GREATERTHAN,
							values: sp_LastUpdItemId
						});
						searchObj.filters.push(ss_ItemIDFilter);
					} //if(Number(sp_LastUpdItemId) > 0)

					//Get page data of saved search Result Set
					searchObj.run();
					var pagedData = searchObj.runPaged({
						pageSize: 50
					});
					log.debug({
						title: 'Saved Search Result',
						details: 'No of pages: ' + pagedData.pageRanges.length + ', No of results: ' + pagedData.count
					});

					var count = 1;
					var breakLoop = false;

					for (var i = 0; i < pagedData.pageRanges.length; i++)
					//for( var i = 0; i < 1; i++ ) //Add this for to run for only one page *Inhibitor*
					{
						if (breakLoop)
							break;

						log.debug({
							title: 'Saved Search Result',
							details: 'Current Page: ' + (i + 1) + ', No of results: ' + pagedData.fetch(i).data.length
						});


						var currentPage = pagedData.fetch(i);
						currentPage.data.forEach(function (result) {
							if (breakLoop)
								return false;

							log.audit({
								title: 'Result',
								details: JSON.stringify(result)
							});
							var ss_InternalId = Number(result.getValue({
								name: "internalid",
								summary: "GROUP",
								label: "Internal ID"
							}));

							var ss_WooItemId = Number(result.getValue({
								name: "custitem_woocommerce_item_id",
								summary: "GROUP",
								label: "Woo Product Id"
							})); //11995;// *Inhibitor*
							var item_type = result.getValue({
								name: "type",
								summary: "GROUP",
								label: "Type"
							});
							log.debug('Saved Search Result', 'NS Item Record Internal Id: ' + ss_InternalId + ', ss_WooItemId: ' + ss_WooItemId + ', Item Type: ' + item_type + ', Count: ' + count);

							{
								if (item_type == 'InvtPart' || item_type == 'inventoryitem') {
									try {
										var itemRecObj = record.load({
											type: record.Type.INVENTORY_ITEM,
											id: ss_InternalId
										});
										var recordType = 0;
									} catch (e) {
										try {
											var itemRecObj = record.load({
												type: record.Type.SERIALIZED_INVENTORY_ITEM,
												id: ss_InternalId
											});
											var recordType = 0;
										} catch (e) {
											try {
												var itemRecObj = record.load({
													type: record.Type.LOT_NUMBERED_INVENTORY_ITEM,
													id: ss_InternalId
												});
												var recordType = 0;
											} catch (e) {
												log.error({
													title: 'Catch Block: Record Load Error',
													details: 'Error Name: ' + e.name + ', \nError Details: ' + e.message
												});
												log.debug({
													title: 'Error in loading record',
													details: 'Error Item Record Id: ' + ss_InternalId
												});
											}
										}
									}
								} else if (item_type == 'Group') {
									var itemRecObj = record.load({
										type: record.Type.ITEM_GROUP,
										id: ss_InternalId
									});
									recordType = 1;
								} else if (item_type == 'Kit' || item_type == 'kititem') {
									var itemRecObj = record.load({
										type: record.Type.KIT_ITEM,
										id: ss_InternalId
									});
									recordType = 2;
								} else {
									log.debug({
										title: 'Error',
										details: 'NetSuite Item Type Not Supported'
									});
									return false;
								}

							}
							if (ss_WooItemId > 0) {
								var prodUpdObj = {};
								prodUpdObj.id = ss_WooItemId.toString();

								//Include Price
								if (sr_PriceUpdChk && sp_PriceUpdChk) {
									if (regPriceLvl) {
										var rpRowNo = itemRecObj.findSublistLineWithValue({
											sublistId: "price1",
											fieldId: 'pricelevelname',
											value: regPriceLvl
										});
										var regularPrice = itemRecObj.getSublistText({
											sublistId: "price1",
											fieldId: 'price_1_',
											line: rpRowNo
										});
										if (regularPrice)
											prodUpdObj.regular_price = regularPrice.toString();
									}
									var ss_UpdateSale = result.getValue({
										name: "custitem_ns_woo_sales_price",
										summary: "GROUP",
										label: "Sales Price"
									});
									var ss_ProdSalePrice = '';
									if (ss_UpdateSale && salePriceLvl) {
										var salesStartDate = itemRecObj.getText({
											fieldId: 'custitem_ns_woo_sales_start_date'
										});
										var salesEndDate = itemRecObj.getText({
											fieldId: 'custitem_ns_woo_sales_end_date'
										});
										log.audit({
											title: 'sales price text',
											details: 'Start Date: ' + salesStartDate + ', Sales End Date' + salesEndDate
										});
										updatesale = LIB_WooCommerce_Item_Export_And_Update.checksalesdate(salesStartDate, salesEndDate)
										log.audit({
											title: 'Update Sales Price',
											details: 'Update sale :' + updatesale
										});
										if (salePriceLvl && updatesale) {
											var spRowNo = itemRecObj.findSublistLineWithValue({
												sublistId: "price1",
												fieldId: 'pricelevelname',
												value: salePriceLvl
											});
											var salePrice = itemRecObj.getSublistValue({
												sublistId: "price1",
												fieldId: 'price_1_',
												line: spRowNo
											});
											if (salePrice)
												prodUpdObj.sale_price = salePrice.toString();
										} else {
											prodUpdObj.sale_price = '';
										}
									}

								} //if( sr_PriceUpdChk && sp_PriceUpdChk ) //Include Price

								//Include Inventory
								if (sr_InvtUpdChk && sp_InvtUpdChk) {
									var ss_WooManageStock = result.getValue({
										name: "custitem_woocommerce_manage_stock",
										summary: "GROUP",
										label: "Woo Manage Stock"
									});
									log.debug('Saved Search Result', 'Woo Manage Stock: ' + ss_WooManageStock + ', Count: ' + count);
									prodUpdObj.manage_stock = ss_WooManageStock;

									if (ss_WooManageStock) {
										var locationCount = itemRecObj.getLineCount({
											sublistId: 'locations'
										});
										var bufferQantity = 0;
										var stockQuantity = 0;
										for (var locRowNo = 0; locRowNo < locationCount; locRowNo++) {
											var stockQty = Number(itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'quantityavailable',
												line: locRowNo
											}));
											var buffQty = Number(itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'locationstorepickupbufferstock',
												line: locRowNo
											}));
											var locationId = itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'locationid',
												line: locRowNo
											});

											var searchObj = search.lookupFields({
												type: record.Type.LOCATION,
												id: locationId,
												columns: ['makeinventoryavailablestore']
											});
											var makeAvailable = searchObj.makeinventoryavailablestore;
											/* var makeAvailable = itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'makeinventoryavailablestore',
												line: locRowNo
											}); */
											if (stockQty || buffQty) {
												var locName = itemRecObj.getSublistValue({
													sublistId: 'locations',
													fieldId: 'location_display',
													line: locRowNo
												});
												log.audit({
													title: 'Quantity Datails',
													details: 'Stock Quantity:' + stockQty + ', buffer Qantity:' + buffQty + 'Name:' + locName + 'make available:' + makeAvailable
												});
											}

											if (makeAvailable) {
												var LineQuantity = Number(itemRecObj.getSublistValue({
													sublistId: 'locations',
													fieldId: 'quantityavailable',
													line: locRowNo
												}));
												stockQuantity += LineQuantity;
												if (LineQuantity > 0) {
													bufferQantity += Number(itemRecObj.getSublistValue({
														sublistId: 'locations',
														fieldId: 'locationstorepickupbufferstock',
														line: locRowNo
													}));
												}

											}

										}
										log.audit({
											title: 'Final Quantity Datails',
											details: 'Stock Quantity:' + stockQuantity + ', buffer Qantity:' + bufferQantity
										})
										stockQuantity = stockQuantity - bufferQantity;
										if (stockQuantity > 0) {
											var ss_ItemAvailQty = stockQuantity;
										} else {
											var ss_ItemAvailQty = 0;
										}

										var ss_WooAllowBackorders = result.getText({
											name: "custitem_woocommerce_backorders",
											summary: "GROUP",
											label: "Woo Allow Backorders"
										}); //'Do not allow';// *Inhibitor*
										log.debug('Saved Search Result', 'ss_ItemAvailQty: ' + ss_ItemAvailQty + ', Allow Backorders: ' + ss_WooAllowBackorders + ', Count: ' + count);

										if (ss_WooAllowBackorders == 'Allow')
											ss_WooAllowBackorders = 'yes';
										else if (ss_WooAllowBackorders == 'Allow, but notify customer')
											ss_WooAllowBackorders = 'notify';
										else //Default: 'Do not allow'
											ss_WooAllowBackorders = 'no';

										prodUpdObj.stock_quantity = ss_ItemAvailQty;
										prodUpdObj.backorders = ss_WooAllowBackorders;
									} else {
										var ss_WooStockStatus = result.getText({
											name: "custitem_woocommerce_stock_status",
											summary: "GROUP",
											label: "Woo Stock Status"
										}); // *Inhibitor*
										log.debug('Saved Search Result', 'Stock Status: ' + ss_WooStockStatus + ', Count: ' + count);
										if (ss_WooStockStatus == 'On backorder')
											ss_WooStockStatus = 'onbackorder';
										else if (ss_WooStockStatus == 'Out of stock')
											ss_WooStockStatus = 'outofstock';
										else //Default: 'In stock'
											ss_WooStockStatus = 'instock';

										prodUpdObj.stock_status = ss_WooStockStatus;
									}
								} //if( sr_InvtUpdChk && sp_InvtUpdChk ) ////Include Inventory

								batchProdsUpdArray.push(prodUpdObj);

							} //if(ss_WooItemId && ss_WooItemId!=undefined && ss_WooItemId!=null)
						}) //currentPage.data.forEach( function(result))

						batchUpdateObj.update = batchProdsUpdArray;
						var api_RequestObj = JSON.stringify(batchUpdateObj);
						var api_PutUrl = '';
						api_PutUrl = sr_ApiUrl + 'products/batch' + '?consumer_key=' + sr_ConsumerKey + '&consumer_secret=' + sr_ConsumerSecret; //'';// *Inhibitor*
						log.audit('API Request', 'PUT URL: ' + api_PutUrl);
						log.audit('API Request', 'API Request Body: ' + api_RequestObj);

						var callLimit = 3,
							callSuccess = false,
							api_PutError = '';
						do {
							log.audit({
								title: 'API Request',
								details: 'Call Limit Left: ' + callLimit
							});
							try {
								callLimit--;
								var api_Response = https.put({
									url: api_PutUrl,
									body: api_RequestObj,
									headers: header
								}); // *Inhibitor*
								log.audit('API Request', 'API Response Type: ' + api_Response + ', Count: ' + count);
								callSuccess = true; //This value will not be set if error is thrown at https.post as it jumps right away to catch
							} //try
							catch (e) {
								log.error('Catch Block: API Request', e);

								if (callLimit == 0) {
									var api_Response = false;
									api_PutError = 'Error in making PUT call. Error name: ' + e.name + '. Error message: ' + e.message;
								} //if( callLimit == 0 )
							} //catch (e)
						} while (callLimit > 0 && !callSuccess); //do

						if (api_Response) {
							var api_RespCode = api_Response.code;
							if (api_RespCode == '200') {
								var api_RespBody = JSON.parse(api_Response.body);
								log.audit('API Response', 'Response Code: ' + api_RespCode + ', Item Body Length: ' + Object.keys(api_RespBody).length + ', Count: ' + count);
								batchProdsUpdArray = [];
							} //if(api_RespCode == '200')
							else {
								log.error({
									title: 'API Error Response',
									details: 'Error in API Response.' + 'Response Code: ' + api_RespCode
								});
								log.error({
									title: 'API Error Response',
									details: 'API Response : ' + JSON.stringify(api_Response)
								});
								log.error({
									title: 'API Error Response',
									details: 'API Response Body: ' + api_Response.body
								});
							} //else
						} //if(api_Response)
						else {
							log.error({
								title: 'API Request Error',
								details: api_PutError
							});
						}

						var remainingUsage = scriptObj.getRemainingUsage();
						//log.debug( 'Price Update Script', 'Remaining governance: ' + remainingUsage );
						if (remainingUsage < 1500) {
							log.error('Reshedule Script', 'Remaining governance: ' + remainingUsage + ', Last updated NS Item Record Id updated to: ' + ss_InternalId + ', Count: ' + count);
							var scheduleScriptTaskObj = task.create({
								taskType: task.TaskType.SCHEDULED_SCRIPT,
								scriptId: runtime.getCurrentScript().id,
								deploymentId: sp_DeploymentId,
								params: {
									custscript_woo_upi_nvar_last_upd_item_id: Number(ss_InternalId)
								}
							});

							scheduleScriptTaskObj.submit();
							breakLoop = true;
						} //if( remainingUsage < 750 )
						count++;
					} //for( var i = 0; i < pagedData.pageRanges.length; i++ )
					log.audit('Price Update Script', 'Remaining Governance Units At End: ' + scriptObj.getRemainingUsage());
				} //if(sr_ConsumerKey && sr_ConsumerSecret && sr_ApiUrl && sp_PriceInvtSSId && Number(sr_LicenceDays) > 0)
			} //try
			catch (e) {
				log.error({
					title: 'Catch Block: Error',
					details: 'Error Name: ' + e.name + ', \nError Details: ' + e.message
				});
				log.error({
					title: 'Catch Block: Error: Catch Block Error: RAW',
					details: e
				});
				var scriptObj = runtime.getCurrentScript();

				var errorJsonArray = [];
				var errorObj = {};
				errorObj.scriptObj = scriptObj;

				var errorBriefObj = {};
				errorBriefObj.errorName = e.name;
				errorBriefObj.errorMessage = e.message;
				errorBriefObj.dateTime = new Date();
				errorBriefObj.remainingUsage = scriptObj.getRemainingUsage();
				errorObj.errorBrief = errorBriefObj;

				errorObj.errorComplete = e;
				errorJsonArray.push(errorObj);

				if (Number(sr_ScriptsErrorFileId) > 0) {
					var errorfileObj = file.load({
						id: sr_ScriptsErrorFileId
					});
					if (errorfileObj.size > 0) {
						errorfileObj.appendLine({
							value: JSON.stringify(errorJsonArray)
						});
						var errorFileId = errorfileObj.save();
					} else {
						var errorfileObj = file.create({
							name: "WooCommerce_Scripts_Error_Report.txt",
							contents: JSON.stringify(errorJsonArray),
							folder: sr_ScriptsFolderId,
							fileType: "PLAINTEXT"
						});
						var errorFileId = errorfileObj.save();
					}
					log.error({
						title: 'Error File Update',
						details: 'Error File Id: ' + errorFileId
					});
				} else {
					log.error({
						title: 'Error File Update failed',
						details: 'Error File Id: ' + errorFileId
					});
					log.error({
						title: 'Catch Block Error',
						details: JSON.stringify(errorJson)
					});
				}
			} //catch (e)
			finally {
				log.error({
					title: 'Scheduled Script',
					details: 'Scheduled script for Price & Inventory Update of Non Variations Ends'
				});
			} //finally
		} //function

		return {
			execute: execute
		}
	});