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
** @author: Gnanadeep Nekkanti & Mahesh Bonagiri
** @dated: 09-07-2020  - MM/DD/YYYY
** @Script Name: SCH_WooCommerce_Orders_Import.js
** @Description: Script working description
** @NApiVersion 2.x
** @NScriptType ScheduledScript
** @NModuleScope SameAccount
*
** @libraries used:
1.libraries file name and its used

-- Date-- 			-- Modified By-- 			--Requested By-- 			--Change Request(Issues, New Functionality, Changes)
DD-MM-YYYY 				Employee Name 				Client Name 					One line description

*/

define([ 'N/search', 'N/log', 'N/record', 'N/runtime', 'N/https', 'N/file', 'N/format', './LIB_WooCommerce_Process_Order', './LIB_NetScore_WooCommerce_License_Validator'  ],
function( search, log, record, runtime, https, file, format, LIB_WooCommerce_Process_Order, LIB_NetScore_License_Validator  )
{
	function execute( scriptContext )
	{
		var scriptsErrorFileId = '';
		var orderId 					= 0;
		try
		{
			log.audit({ title: 'WooCommerce Orders Import Script', details: 'Schedule Script for Order Import Begins' });
			var statObj = {};
			statObj.createdSalesOrders 	= 0;
			statObj.createdErrorRecords = 0;
			statObj.totalImportedOrders = 0;
			statObj.eligibleOrders 		= 0;
			statObj.existingOrders 		= 0;
			statObj.existingErrorRec 	= 0;
			statObj.orderIndex 			= 0;
			
			//Load WooCommerce Integration Record and get values
			{
				var scriptObj 		= runtime.getCurrentScript();
				var deploymentId 	= scriptObj.deploymentId;
				var setupRecId 		= scriptObj.getParameter( 'custscript_import_order_setup_record_id' );
				var orderContext 	= scriptObj.getParameter( 'custscript_single_order_id' );
				var lastOrderDate 	= scriptObj.getParameter( 'custscript_mis_last_processed_order_date' );
				
				log.audit( 'Script Parameters', 'Deployment Id: ' + deploymentId + 'Setup Record Id: ' + setupRecId + 'Single Order Id: ' + orderContext + ', Last Order Date: ' + lastOrderDate);
				
				var sr_LookupFields = [
					'custrecord_ns_woo_scripts_folder_id',
					'custrecord_ns_woo_scripts_error_file',
					'custrecord_ns_woo_product_code',
					'custrecord_ns_woo_sandbox_account',
					'custrecord_ns_woo_production_account' ,
					'custrecord_ns_woo_consumer_key',
					'custrecord_ns_woo_consumer_secret',
					'custrecord_ns_woo_woocommerce_api_url',
					'custrecord_ns_woo_woocommerce_timezone',
					'custrecord_ns_woo_orders_age',
					'custrecord_ns_woo_import_orders',
					'custrecord_ns_woo_item_sku_field_id',
					'custrecord_ns_woo_orders_json_folder',
					'custrecord_ns_woo_b2c_order_form',
					'custrecord_ns_woo_b2b_order_form',
					'custrecord_ns_woo_import_order_status',
					'custrecord_ns_woo_last_imported_order_da',
					'custrecord_use_body_level_discount',
					'custrecord_ns_woo_discount_item',
					'custrecord_use_standard_taxes',
					'custrecord_ns_woo_tax_item',
					'custrecord_ns_woo_default_tax_code',
					'custrecord_feeline',
					'custrecord_ns_woo_feeline_item',
					'custrecord_coupons',
					'custrecord_egift_card',
					'custrecord_ns_woo_egift_card_redem_item',
					'custrecord_egift_card_key',
					'custrecord_stripe_charge_item_id',
					'custrecord_stripe_charge_checkbox',
					'custrecord_stripe_charge_key',
					'custrecord_ns_woo_def_payment_method',
					'custrecord_ns_woo_def_shipping_method',
					'custrecord_ns_woo_order_location',
					'custrecord_ns_woo_item_location',
					'custrecord_ns_woo_order_department',
					'custrecord_ns_woo_order_lead_source',
					'custrecord_create_company_as_company_rec',
					'custrecord_create_contact',
					'custrecord_ns_woo_subsidiary',
					'custrecord_set_def_ship_bill_address',
					'custrecord_woo_ns_using_tax_ratecode_map'
				];
				
				var setupRecObj = search.lookupFields({ type: 'customrecord_woocommerce_connector_setup', id: setupRecId, columns: sr_LookupFields });
				log.audit( 'Setup Record Lookup Object', setupRecObj );

				var scriptsFolderId 		= setupRecObj.custrecord_ns_woo_scripts_folder_id;
				var sEnv 					= setupRecObj.custrecord_ns_woo_sandbox_account;
				var pEnv 					= setupRecObj.custrecord_ns_woo_production_account;
				var consumer_key 			= setupRecObj.custrecord_ns_woo_consumer_key;
				var consumer_secret 		= setupRecObj.custrecord_ns_woo_consumer_secret;
				var apiUrl 					= setupRecObj.custrecord_ns_woo_woocommerce_api_url;
				var importOrder 			= setupRecObj.custrecord_ns_woo_import_orders;
				var itemRecSkuFieldId 		= setupRecObj.custrecord_ns_woo_item_sku_field_id;
				var orderFolder 			= setupRecObj.custrecord_ns_woo_orders_json_folder;
				var orderDate 				= setupRecObj.custrecord_ns_woo_last_imported_order_da;
				var bodyLevelDiscount 		= setupRecObj.custrecord_use_body_level_discount;
				var standardTaxes 			= setupRecObj.custrecord_use_standard_taxes;
				var feeLineCheckbox 		= setupRecObj.custrecord_feeline;
				var couponsCheckbox 		= setupRecObj.custrecord_coupons;
				var eGiftCardCheckbox 		= setupRecObj.custrecord_egift_card;
				var eGiftCardKey			= setupRecObj.custrecord_egift_card_key;
				var stripeChargeCheckBox 	= setupRecObj.custrecord_stripe_charge_checkbox;
				var stripeChargeKey 		= setupRecObj.custrecord_stripe_charge_key;
				var customerAsCompany 		= setupRecObj.custrecord_create_company_as_company_rec;
				var createContact 			= setupRecObj.custrecord_create_contact;
				var setDefaultAddress 		= setupRecObj.custrecord_set_def_ship_bill_address;
				var taxRateCodeMap 			= setupRecObj.custrecord_woo_ns_using_tax_ratecode_map;
				/* {
					var productCode = setupRecObj.custrecord_ns_woo_product_code;
					log.debug({ title: 'Setup Record Load Block', details: "Product Code: " + productCode });
					if(!LIB_NetScore_License_Validator.validateLicense(productCode)) 
					{
						log.debug({ title: 'License.', details: "Your license has expired. Please renew your license." });
						return false;
					}
				} */
				if(setupRecObj.custrecord_ns_woo_scripts_error_file !='' && setupRecObj.custrecord_ns_woo_scripts_error_file != undefined)
					scriptsErrorFileId 		= setupRecObj.custrecord_ns_woo_scripts_error_file[0].value;
				
				if(setupRecObj.custrecord_ns_woo_orders_age != '' && setupRecObj.custrecord_ns_woo_orders_age != undefined)
					var orderAge 				= setupRecObj.custrecord_ns_woo_orders_age[0].text
				
				if(setupRecObj.custrecord_ns_woo_b2c_order_form != '' && setupRecObj.custrecord_ns_woo_b2c_order_form != undefined)
					var b2cOrderForm 				= setupRecObj.custrecord_ns_woo_b2c_order_form[0].value;
				
				if(setupRecObj.custrecord_ns_woo_b2b_order_form != '' && setupRecObj.custrecord_ns_woo_b2b_order_form != undefined)
					var b2bOrderForm 				= setupRecObj.custrecord_ns_woo_b2b_order_form[0].value;
				
				if(setupRecObj.custrecord_ns_woo_import_order_status != '' && setupRecObj.custrecord_ns_woo_import_order_status != undefined)
					var orderStatus 			= setupRecObj.custrecord_ns_woo_import_order_status[0].text;
				
				if(setupRecObj.custrecord_ns_woo_discount_item != '' && setupRecObj.custrecord_ns_woo_discount_item != undefined)
					var discountItem 			= setupRecObj.custrecord_ns_woo_discount_item[0].value;
				
				if(setupRecObj.custrecord_ns_woo_tax_item != '' && setupRecObj.custrecord_ns_woo_tax_item != undefined)
					var defaultTaxItem 			= setupRecObj.custrecord_ns_woo_tax_item[0].value;
				
				if(setupRecObj.custrecord_ns_woo_default_tax_code != '' && setupRecObj.custrecord_ns_woo_default_tax_code != undefined)
					var taxCode 				= setupRecObj.custrecord_ns_woo_default_tax_code[0].value;
				
				if(setupRecObj.custrecord_ns_woo_feeline_item != '' && setupRecObj.custrecord_ns_woo_feeline_item != undefined)
					var feeLineItem 			= setupRecObj.custrecord_ns_woo_feeline_item[0].value;
				
				if(setupRecObj.custrecord_ns_woo_egift_card_redem_item != '' && setupRecObj.custrecord_ns_woo_egift_card_redem_item != undefined)
					var eGiftCardRedemItem 		= setupRecObj.custrecord_ns_woo_egift_card_redem_item[0].value;
				
				if(setupRecObj.custrecord_stripe_charge_item_id != '' && setupRecObj.custrecord_stripe_charge_item_id != undefined)
					var stripeChargeItemId 		= setupRecObj.custrecord_stripe_charge_item_id[0].value;
				
				if(setupRecObj.custrecord_ns_woo_def_payment_method != '' && setupRecObj.custrecord_ns_woo_def_payment_method != undefined)
					var defaultPayment 			= setupRecObj.custrecord_ns_woo_def_payment_method[0].value;
				
				if(setupRecObj.custrecord_ns_woo_def_shipping_method != '' && setupRecObj.custrecord_ns_woo_def_shipping_method != undefined)
					var defaultShipping 		= setupRecObj.custrecord_ns_woo_def_shipping_method[0].value;
				
				if(setupRecObj.custrecord_ns_woo_order_location != '' && setupRecObj.custrecord_ns_woo_order_location != undefined)
					var orderLocation 			= setupRecObj.custrecord_ns_woo_order_location[0].value;
				
				if(setupRecObj.custrecord_ns_woo_item_location != '' && setupRecObj.custrecord_ns_woo_item_location != undefined)
					var itemLocation 			= setupRecObj.custrecord_ns_woo_item_location[0].value;
				
				if(setupRecObj.custrecord_ns_woo_order_department != '' && setupRecObj.custrecord_ns_woo_order_department != undefined)
					var department 				= setupRecObj.custrecord_ns_woo_order_department[0].value;
				
				if(setupRecObj.custrecord_ns_woo_order_lead_source != '' && setupRecObj.custrecord_ns_woo_order_lead_source != undefined)
					var leadSource 				= setupRecObj.custrecord_ns_woo_order_lead_source[0].value;
				
				if(setupRecObj.custrecord_ns_woo_subsidiary != '' && setupRecObj.custrecord_ns_woo_subsidiary != undefined)
					var subsidiary 				= setupRecObj.custrecord_ns_woo_subsidiary[0].value;
				
				if(setupRecObj.custrecord_ns_woo_woocommerce_timezone!='' && setupRecObj.custrecord_ns_woo_woocommerce_timezone != undefined)
					var wooTimeZoneID 			= setupRecObj.custrecord_ns_woo_woocommerce_timezone[0].value;
				
				if( (runtime.envType == 'PRODUCTION' && pEnv != true) || (runtime.envType == 'SANDBOX' && sEnv != true) )
				{
					log.error( 'Script Exiting...', 'Script execution environment differs from setup record.' );
					return false;
				}//if( (runtime.envType == 'PRODUCTION' && pEnv != true) || (runtime.envType == 'SANDBOX' && sEnv != true))
				if( !importOrder )
				{
					log.error({ title: 'Script Exiting...', details: 'Import orders disabled in setup record.' });
					return false;
				}
				var importMultiple = false;
				var importMissed = false;
				var importSingle = false;
				
				if(!orderContext && (orderContext == undefined || orderContext == null)){// Import All Orders
					var importOrdersTill = dateCalc(wooTimeZoneID, orderAge,0,0);
					importMultiple = true
				}
				if(orderContext && orderContext != undefined && orderContext != null && typeof(orderContext) == 'string')//Import missed Orders
				{
					var importOrdersTill = dateCalc(wooTimeZoneID,0, 6, 'hrs'); // orderDate;//
					log.debug( 'Setup Record Data', 'Import Order Before: ' + importOrdersTill );

					var importOrdersAfter = '';
					if( lastOrderDate )
					{
						importOrdersAfter = lastOrderDate;
						log.debug( 'Setup Record Data', 'Import Orders After Before(lastOrderDate): ' + importOrdersAfter );
					}
					else
					{
						importOrdersAfter = dateCalc(wooTimeZoneID,0, 7, 'days');
						log.debug( 'Setup Record Data', 'Import Orders After(Calculated Time): ' + importOrdersAfter );
					}
					importMissed = true;
				}
			}//Load WooCommerce Setup Record and get values

			if(consumer_key && consumer_secret && apiUrl )
			{
				var importSingle = false;
				var header = [];
				header['Content-Type'] = 'application/json';
				
				if(importMissed)//Import missed Orders
				{
					var getUrl = apiUrl + 'orders?consumer_key=' + consumer_key + '&consumer_secret=' + consumer_secret + '&after=' + importOrdersAfter + '&before=' + orderDate + '&order=asc&per_page=100';
					log.audit( 'Connection Establishment', 'Missed Order GET URL: ' + getUrl );
				}
				if(importMultiple)// Import All Orders
				{
					var getUrl = apiUrl + 'orders?consumer_key=' + consumer_key + '&consumer_secret=' + consumer_secret + '&after=' + orderDate + '&before=' + importOrdersTill + '&order=asc&per_page=60';
					log.audit( 'Connection Establishment', 'Multiple Orders GET URL: ' + getUrl );
				}
				if (orderContext && orderContext != undefined && orderContext != null && typeof(orderContext) == 'number')//Import Single Order 
				{
					var getUrl 			= apiUrl + 'orders/' + orderContext + '?consumer_key=' + consumer_key + '&consumer_secret=' + consumer_secret ;
					log.audit( 'Connection Establishment', 'Single Order GET URL: ' + getUrl );
					var orders_body_json			=[];
					importSingle = true;
				}
				//Connection Establishment Code......
				{
					var callLimit = 3, callSuccess = false, api_PutError = '';
					do
					{
						log.audit({ title: 'API Request', details: 'Call Limit Left: ' + callLimit });
						try
						{
							callLimit--;
							var response = https.get({ url: getUrl, headers: header }); //'';// *Inhibitor*
							log.audit( 'Connection Establishment','RAW Response: ' + response  );
							callSuccess = true;//This value will not be set if error is thrown at https.post as it jumps right away to catch
						}//try
						catch (e)
						{
							log.error('Catch Block: Connection Establishment', e);

							if( callLimit == 0 )
							{
								var response = false;
								api_PutError = 'Error in making PUT call. Error name: ' + e.name + '. Error message: ' + e.message;
							}//if( callLimit == 0 )
						}//catch (e)
					} while ( callLimit > 0 && !callSuccess );//do
				}
				if(response)
				{
					var responseCode 			= response.code;
					var order_body				= response.body;
					
					if(responseCode == '200')
					{
						if(importSingle)
						{
							var order_body_obj			= JSON.parse(order_body);
							orders_body_json.push(order_body_obj);
							var ordersCount 			= orders_body_json.length;
						}
						else
						{
							var orders_body_json 		= JSON.parse(order_body);
							var ordersCount 			= Object.keys(orders_body_json).length;
						}
						log.audit( 'API Response', 'Response Body: ' + order_body + ' Response Code: ' + responseCode );
						log.audit( 'API Response', 'Response Length: ' + ordersCount );
					
						if(ordersCount > 0)
						{
							//Create JSON file for all the orders
							var dt = new Date();
							var allOrdersFile 	= file.create({ name: 'WooCommerce_Orders_' + dt + '.json', contents: order_body, folder: orderFolder, fileType: 'JSON' });
							var allOrdersFileId = allOrdersFile.save();
							log.debug( 'Create All Orders JSON File', 'All Orders JSON File ID: ' + allOrdersFileId );

							//for(var i = 0; i < ordersCount; i++)
							for(var i = 0; i < 1; i++)
							{
								statObj.orderIndex = i;
								log.audit({ title: 'Remaining Usage', details: 'Remaining Usage At Beginning Of Order Processing: ' + scriptObj.getRemainingUsage() + ' i:' + i });

								var order_details_json = orders_body_json[i];
								log.debug( 'Individual Order', 'Single Order: ' + JSON.stringify(order_details_json) + ' i:' + i );

								var orderDetails = [];

								orderDetails['status'] 				= '';
								orderDetails['status'] 				= order_details_json.status;
								log.debug( 'Individual Order', 'Order Status: ' + orderDetails['status'] + ' i:' + i );
								orderDetails['date_created'] 	= '';
								lastProcessedOrderDate 				= order_details_json.date_created;
								orderDetails['date_created'] 	= order_details_json.date_created;
								log.debug( 'Individual Order', 'Order Creation Date: ' + orderDetails['date_created'] + ' i:' + i );

								if( orderStatus.indexOf('any') >= 0 )
								{
									var validStatus = 0;
								}
								else
								{
									var validStatus = orderStatus.indexOf(orderDetails['status']);
								}
								log.debug( 'Individual Order', 'Valid Status Value: ' + validStatus + ' i:' + i );

								if( validStatus >= 0 ) //orderDetails['status'] == orderStatus
								{
									statObj.eligibleOrders++;
									//Order Array Declaration
									{
										orderDetails['defaultTaxItem'] 					= defaultTaxItem;
										orderDetails['taxCode'] 						= taxCode;
										orderDetails['defaultPayment'] 					= defaultPayment;
										orderDetails['leadSource'] 						= leadSource;
										orderDetails['discountItem'] 					= discountItem;
										orderDetails['eGiftCardRedemItem'] 				= eGiftCardRedemItem;
										orderDetails['eGiftCardCheckbox'] 				= eGiftCardCheckbox;
										orderDetails['couponsCheckbox'] 				= couponsCheckbox;
										orderDetails['eGiftCardKey'] 					= eGiftCardKey;
										orderDetails['stripeChargeItemId']				= stripeChargeItemId
										orderDetails['stripeChargeCheckBox'] 			= stripeChargeCheckBox;
										orderDetails['stripeChargeKey'] 				= stripeChargeKey;
										orderDetails['feeLineCheckbox'] 				= feeLineCheckbox;
										orderDetails['feeLineItem'] 					= feeLineItem;
										orderDetails['location'] 						= orderLocation;
										orderDetails['itemLocation'] 					= itemLocation;
										orderDetails['subsidiary'] 						= subsidiary;
										orderDetails['department'] 						= department;
										orderDetails['b2bOrderForm'] 					= b2bOrderForm;
										orderDetails['b2cOrderForm'] 					= b2cOrderForm;
										orderDetails['defaultShipping'] 				= defaultShipping;
										orderDetails['orderFolder'] 					= orderFolder;
										orderDetails['itemRecSkuFieldId'] 				= itemRecSkuFieldId;
										orderDetails['apiUrl'] 							= apiUrl;
										orderDetails['consumer_key'] 					= consumer_key;
										orderDetails['consumer_secret'] 				= consumer_secret;
										orderDetails['bodyLevelDiscount'] 				= bodyLevelDiscount;
										orderDetails['standardTaxes'] 					= standardTaxes;
										orderDetails['customerAsCompany'] 				= customerAsCompany;
										orderDetails['createContact'] 					= createContact;
										orderDetails['create_contact']					= createContact;
										orderDetails['setupRecId']						= setupRecId;
										orderDetails['setDefaultAddress']				= setDefaultAddress;
										orderDetails['taxRateCodeMap']					= taxRateCodeMap;
										orderDetails['orderJsonFileId'] 				= '';
										orderDetails['reprocess_Chk']					= false;

									{//Order Fields
										orderDetails['order_id'] 						= '';
										orderDetails['parent_id'] 						= '';
										orderDetails['number'] 							= '';
										orderDetails['order_key'] 						= '';
										orderDetails['created_via'] 					= '';
										orderDetails['version'] 						= '';

										orderDetails['currency'] 						= '';
										orderDetails['date_modified'] 					= '';
										orderDetails['discount_total'] 					= '';
										orderDetails['discount_tax'] 					= '';

										orderDetails['shipping_total'] 					= '';
										orderDetails['shipping_tax'] 					= '';
										orderDetails['cart_tax'] 						= '';
										orderDetails['order_total'] 					= '';
										orderDetails['total_tax'] 						= '';

										orderDetails['prices_include_tax'] 				= '';

										//Customer Information
										orderDetails['customer_id'] 					= '';
										orderDetails['customer_ip_address'] 			= '';
										orderDetails['customer_note'] 					= '';
										orderDetails['customer_first_name'] 			= '';
										orderDetails['customer_email'] 					= '';
										orderDetails['customer_last_name'] 				= '';
										orderDetails['customer_phone'] 					= '';

										//Billing Information
										orderDetails['bill_first_name'] 				= '';
										orderDetails['bill_last_name'] 					= '';
										orderDetails['bill_company'] 					= '';
										orderDetails['bill_address_1'] 					= '';
										orderDetails['bill_address_2'] 					= '';
										orderDetails['bill_city'] 						= '';
										orderDetails['bill_state'] 						= '';
										orderDetails['bill_postcode'] 					= '';
										orderDetails['bill_country'] 					= '';
										orderDetails['bill_email'] 						= '';
										orderDetails['bill_phone'] 						= '';

										//Shipping Information
										orderDetails['ship_first_name'] 				= '';
										orderDetails['ship_last_name'] 					= '';
										orderDetails['ship_company'] 					= '';
										orderDetails['ship_address_1'] 					= '';
										orderDetails['ship_address_2'] 					= '';
										orderDetails['ship_city'] 						= '';
										orderDetails['ship_state'] 						= '';
										orderDetails['ship_postcode'] 					= '';
										orderDetails['ship_country'] 					= '';

										//Payment Information
										orderDetails['payment_method'] 					= '';
										orderDetails['payment_method_title'] 			= '';
										orderDetails['transaction_id'] 					= '';
										orderDetails['date_paid'] 						= '';
										orderDetails['date_completed'] 					= '';

										//Tax Information
										orderDetails['tax_id'] 							= '';
										orderDetails['tax_rate_code'] 					= '';
										orderDetails['tax_rate_id'] 					= '';
										orderDetails['tax_label'] 						= '';
										orderDetails['tax_total'] 						= '';

										//Shipping Method Information
										orderDetails['shipping_method_id'] 				= '';
										orderDetails['method_title'] 					= '';
										orderDetails['method_id'] 						= '';
										orderDetails['shipping_m_total'] 				= '';
										orderDetails['shipping_m_total_tax'] 			= '';
										
										//Coupon Details
										orderDetails['egift_redemption'] 				= false;
										orderDetails['coupon_redemption'] 				= false;
										orderDetails['coupon_lines'] 					= '';
									}

									}//Order Array Declaration

									//Search For Order In NetSuite
									orderDetails['order_id'] = order_details_json.id;
									orderId = orderDetails['order_id'];
									orderDetails['date_created'] = order_details_json.date_created;

									log.audit( 'Order Search', 'Creating Search for Order ID: ' + orderDetails['order_id'] );
									//Create SO Search
									var orderIdSrch = search.create({
										type: search.Type.SALES_ORDER,
										filters: [{
											name: 'custbody_woocommerce_order_id',
											operator: 'is',
											values: orderDetails[ 'order_id' ]
										}]
									});
									//Running SO Search
									var order_Result 	= orderIdSrch.run().getRange({ start: 0, end: 1 });
									//log.debug( 'Order Search', 'Order Search Result Length for Order ID: ' + orderDetails['order_id'] + ' is: ' + order_Result.length );
									
									if(order_Result.length == 0)//Order Does Not Exist
									{
										//Create Error Record Search
										var errRecSea = search.create({
											type: 'customrecord_woocommerce_error_record',
											filters: [
												[ 'name', 'is', orderDetails[ 'order_id' ] ],
												'and',
												[ 'isinactive', 'is', 'F' ]
											]
										});
										//Running Error Record Search
										var errRecSeaRes = errRecSea.run().getRange({ start: 0, end: 1 });
										if(errRecSeaRes.length == 0)//Error Record Does Not Exist
										{
											processOrderReturn =  LIB_WooCommerce_Process_Order.processOrder( order_details_json, orderDetails, statObj );
											statObj = processOrderReturn.statObj;
											if( processOrderReturn.error )
											{
												var e = processOrderReturn.errorObj;
												throw e;
											}
											//Update the Last Order Date In Setup Record
											if(importMultiple ){
												var recordId = record.submitFields({type: 'customrecord_woocommerce_connector_setup',id: setupRecId,values: {'custrecord_ns_woo_last_imported_order_da': orderDetails[ 'date_created' ],}});
												log.debug( 'Last Order Date Update', 'Last Order Date Updated To: ' + orderDetails['date_created'] );
												log.debug( 'Last Order ID Update', 'Last Imported Order ID Updated To: ' + orderDetails['order_id'] );
											}
											log.audit({ title: 'Remaining Usage', details: 'Remaining Usage At End Of Order Processing: ' + scriptObj.getRemainingUsage() + ' i:' + i });
										}//if(errRecSeaRes.length == 0) //Error Record doesnot exist
										else{
											statObj.existingErrorRec++;
											if(importMultiple )
												record.submitFields({ type: 'customrecord_woocommerce_connector_setup', id: setupRecId, 	values: { 'custrecord_ns_woo_last_imported_order_da': orderDetails['date_created'] } });
											log.debug( 'Last Order Date Update','Last Order Date Updated To: ' + orderDetails['date_created'] );
											log.debug( 'Error Record Search', 'Error Record For WooCommerce Order: ' + orderDetails['order_id'] + ' Already Exists with Record ID: ' + errRecSeaRes[0].id );
										}
									}//if(order_Result.length == 0) //Order Does Not Exist
									else
									{
										log.debug( 'Order Already Exists', 'Sales Order Record With ID: ' + order_Result[0].id + ' Already Exists For Woo Order ID: ' + orderDetails['order_id'] );
										statObj.existingOrders++;
										if(importMultiple )
											var recordId = record.submitFields({ type: 'customrecord_woocommerce_connector_setup', id: setupRecId, 	values: { 'custrecord_ns_woo_last_imported_order_da': orderDetails['date_created'] } });
										log.debug( 'Last Order Date Update','Last Order Date Updated To: ' + orderDetails['date_created'] );
									}
								}//if(orderDetails['status'] == orderStatus) //Processing
								else
								{
									log.debug( 'Ineligible Order Status','Order Ineligible to Import as its status is: ' + orderDetails['status'] + ' i:' + i  );
									if(importMultiple )
										var recordId = record.submitFields({ type: 'customrecord_woocommerce_connector_setup', id: setupRecId, 	values: { 'custrecord_ns_woo_last_imported_order_da': orderDetails['date_created'] } });
									log.debug( 'Last Order Date Update','Last Order Date Updated To: ' + orderDetails['date_created'] + ' i:' + i  );
								}
							}//for(var i = 0; i < orders_body.length; i++)
							if((importMissed && ordersCount == 100 ) || ( importMultiple && ordersCount ==60) )
							{
								log.debug({ title: 'Script Reschedule', details: 'Last Processed Order Date: ' + lastProcessedOrderDate });
								var scheduleScriptTaskObj = task.create({
									taskType: task.TaskType.SCHEDULED_SCRIPT,
									scriptId: runtime.getCurrentScript().id,
									deploymentId: runtime.getCurrentScript().deploymentId,
									params: {
										custscript_moi_last_processed_order_date: lastProcessedOrderDate
									}
								});
								scheduleScriptTaskObj.submit();
							}else{
								log.debug({title: 'Script Reschedule', details: 'Script reshedule not necessary as orders count is ' + ordersCount });
							}
						}else{
							log.error({ title: 'Orders Not Imported', details: 'Response Body: ' + order_body });
						}//if(order_body)
					}else{
						log.error({ title: 'Orders Not Imported', details: "Didn't import as either new orders don't exist or API response is error. Orders Count: " + ordersCount + ' Response Code: ' + responseCode });
						log.error({ title: 'Orders Not Imported', details: 'Response Code: ' + responseCode });
					}//if(responseCode == '200')
				}else{
					log.error('API Response Error','No Response From the server')
				}//if(response)
				//var recordId = record.submitFields({ type: 'customrecord_woocommerce_connector_setup', id: setupRecId, values: { 'custrecord_ns_woo_orders_imported_till': importOrdersTill,'custrecord_ns_woo_last_imported_order_da': orderDetails['date_created'] } });
			}//if(consumer_key && consumer_secret && apiUrl )
		}//try
		catch (e)
		{
			log.error({	title: 'Orders Import Script: Catch Block Error', details: 'Error Name: ' + e.name + ',\nError Message: ' + e.message });
			log.error({	title: 'Orders Import Script: Catch Block Error: RAW', details: e });
			var scriptObj = runtime.getCurrentScript();
			if( e.name != "SSS_CONNECTION_TIME_OUT")
			{
				var errorJsonArray 	= [];
				var errorObj 				= {};
				errorObj.scriptObj 	= scriptObj;

				var errorBriefObj 						= {};
				errorBriefObj.errorName 			= e.name;
				errorBriefObj.errorMessage 		= e.message;
				errorBriefObj.dateTime 				= new Date();
				if( Number(orderId) > 0 )
					errorBriefObj.orderId 			= orderId;
				else
					errorBriefObj.orderId 			= '';
				errorBriefObj.remainingUsage 	= scriptObj.getRemainingUsage();
				errorObj.errorBrief 					= errorBriefObj;

				errorObj.errorComplete 				= e;
				errorJsonArray.push(errorObj);

				if(Number(scriptsErrorFileId) > 0)
				{
					var errorfileObj = file.load({ id: scriptsErrorFileId });
					if(errorfileObj.size > 0)
					{
						errorfileObj.appendLine({ value: JSON.stringify(errorJsonArray) });
						var errorFileId = errorfileObj.save();
					}
					else
					{
						var errorfileObj = file.create({ name: "WooCommerce_Scripts_Error_Report.txt", contents: JSON.stringify(errorJsonArray), folder: scriptsFolderId, fileType: "PLAINTEXT" });
						var errorFileId = errorfileObj.save();
					}
					log.error({ title:'Error File Update', details:'Error File Id: ' + errorFileId });
				}
				else
				{
					log.error({ title:'Error File Update failed', details:'Error File Id: ' + errorFileId });
					log.error({ title:'Catch Block Error', details: JSON.stringify(errorJsonArray) });
				}
			}
		}
		finally
		{
			log.audit({ title: 'Statistics', details: 'Total Orders Imported: ' + statObj.totalImportedOrders + ', Eligible Orders: ' + statObj.eligibleOrders + ', Sale Orders Created: ' + statObj.createdSalesOrders + ', Error Records Created: ' + statObj.createdErrorRecords + ', Existing Orders: ' + statObj.existingOrders + ', Existing Error Records: ' + statObj.existingErrorRec });
			log.audit({ title: 'WooCommerce Orders Import Script', details: 'Schedule Script for Order Import Ends.' });
		}
	}//function execute(scriptContext)

	function dateCalc(wooTimeZoneID,orderAge,setBackValue, setBackType)
	{
		//Output Format : ISO8601 format : YYYY-MM-DDTHH:MM:SS : String
		var date = new Date();
		if(orderAge && setBackValue == 0 && setBackType == 0)
		{
			date.setMinutes(date.getMinutes() - Number(orderAge));
		}
		else if(setBackValue && setBackType && orderAge == 0)
		{
			if(setBackType == 'days')
				date.setDate(date.getDate() - Number(setBackValue));
			else if(setBackType == 'hrs')
				date.setHours(date.getHours() - Number(setBackValue));
			else if(setBackType == 'mins')
				date.setMinutes(date.getMinutes() - Number(setBackValue));
		}
		var wooOslonValue = Object.keys(format.Timezone)[Number(wooTimeZoneID)-1];
		var wooTimeZone = format.Timezone[wooOslonValue];

		var wooDateTime = format.format({ value: date, type: format.Type.DATETIME, timezone: wooTimeZone });
		wooDateTime = wooDateTime.split(' ');
		var wooDate = wooDateTime[0].split('/');
		wooDate[0] = (wooDate[0] < 10) ? 0 + wooDate[0] : wooDate[0]; //Month
		wooDate[1] = (wooDate[1] < 10) ? 0 + wooDate[1] : wooDate[1]; //Date
		var wooTime = wooDateTime[1].split(':');

		if(wooDateTime[2] == 'am' || wooDateTime[2] == 'pm')
		{
			//Hours = If(pm)?[if(12pm)?return 12:add 12]:[ if(<10)?prefix 0:{ if(12am)?return 00:return asitis } ]
			wooTime[0] = (wooDateTime[2] == 'pm') ?( (Number(wooTime[0]) == '12') ? wooTime[0] : Number(wooTime[0]) + 12 ) : ( (Number(wooTime[0]) < 10) ? 0 + wooTime[0] : ((Number(wooTime[0]) == 12) ? '00' : wooTime[0] ) );
			var outputDateTime 	= wooDate[2] + '-' + wooDate[0] + '-' + wooDate[1]  + 'T' + wooTime[0] + ':' + wooTime[1] + ':' + wooTime[2];
		}
		else
		{
			wooTime[0] = (Number(wooTime[0]) < 10) ? (0 + wooTime[0]) : wooTime[0];
			var outputDateTime 	= wooDate[2] + '-' + wooDate[0] + '-' + wooDate[1]  + 'T' + wooTime[0] + ':' + wooTime[1] + ':' + wooTime[2];
		}
		return outputDateTime;
	}
	return {
		execute: execute
	};
});
