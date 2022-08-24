/**
** @client: WooCommerce	
** @author: Gnanadeep & Mahesh Bonagiri	
** @dated: 05/07/2020 -MM/DD/YYYY
 ** @Script Name: LIB_WooCommerce_Create_Order.js
 ** @Description: Library script to create/update customer record.
 ** @NApiVersion 2.x
 ** @NModuleScope Public
**/
define(['N/record', 'N/search', 'N/format'],
function (record, search, format)
{
	function createSalesOrder(customerid, orderDetails, orderLineItems)
	{
		var errorArray = [];
		try
		{
			log.audit( 'WooCommerce Create Sales Order Script', 'Create Sales Order Script Begins' );

			var orderId 						= orderDetails['order_id'];
			var taxcode 						= orderDetails['taxCode'];
			var defaultTaxItem 					= orderDetails['defaultTaxItem'];
			var leadSource						= orderDetails['leadSource'];
			var defaultPayment 					= orderDetails['defaultPayment'];
			var defaultShipping 				= orderDetails['defaultShipping'];
			var feeLineItem 					= orderDetails['feeLineItem'];
			var stripeChargeItem 				= orderDetails['stripeChargeItemId'];
			var eGiftCardRedemItem 				= orderDetails['eGiftCardRedemItem'];
			var discountItem 					= orderDetails['discountItem'];
			var shippingMethod 					= orderDetails['method_title'];
			var paymentMethod 					= orderDetails['payment_method_title'];
			var subsidiary 						= orderDetails['subsidiary'];
			var setupRecId 						= orderDetails['setupRecId'];
			var NS_TaxId                        = -7;
			var objRecord = record.create({ type: record.Type.SALES_ORDER, isDynamic: true });
			
			log.debug( 'Create SO Script', 'Customer Id: ' + customerid );
			objRecord.setValue({ fieldId: 'entity', value: customerid });
			
			log.debug( 'Create SO Script', 'Order Form: ' + orderDetails['b2cOrderForm'] );
			objRecord.setValue({ fieldId: 'customform', value: orderDetails['b2cOrderForm'] });

			//Set Order Id
			log.debug( 'Create SO Script', 'Order ID: ' + orderDetails['order_id'] );
			objRecord.setValue({ fieldId: 'custbody_woocommerce_order_id', value: orderDetails['order_id'] });

			objRecord.setValue({ fieldId: 'custbody_woocommerce_order_status', value: orderDetails['status'] });

			//Set PO# field
			objRecord.setValue({ fieldId: 'otherrefnum', value: orderDetails['order_id'] });

			//Set Lead Source
			log.debug( 'Create SO Script', 'Lead Source: ' + leadSource );
			objRecord.setValue({ fieldId: 'leadsource', value: leadSource });

			log.debug( 'Create SO Script', ' Source: Web (Mind Games SC)' );
			objRecord.setText({ fieldId: 'source', text: 'Web (Mind Games SC)'});
			
			//Set Customer Note
			log.debug( 'Create SO Script', 'Customer Note: ' + orderDetails['customer_note'] );
			objRecord.setValue({ fieldId: 'memo', value: orderDetails['customer_note'] });

			//Set department
			log.debug( 'Create SO Script', 'Department: ' + orderDetails['department'] );
			objRecord.setValue({ fieldId: 'department', value: orderDetails['department'] });

			log.debug( 'Create SO Script', 'Subsidary: ' + subsidiary );
			//if(subsidiary)
				//objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });

			log.debug( 'Create SO Script', 'Location: ' + orderDetails['location'] );
			if(orderDetails['location'])
				objRecord.setValue({ fieldId: 'location', value: orderDetails['location'] });
			
			log.debug( 'Create SO Script', 'Default Shipping Address: ' + orderDetails['defaultShippingAddress'] + ', Set So Shipping Address Id: ' + orderDetails['setSoShipAddress']);
			if( orderDetails['defaultShippingAddress'] )
			{
				objRecord.setValue({ fieldId: 'shipaddresslist', value: orderDetails['defaultShippingAddress'] });
			}
			else if( orderDetails['setSoShipAddress'] )
			{
				objRecord.setValue({ fieldId: 'shipaddresslist', value: orderDetails['setSoShipAddress'] });
			}
			
			log.debug( 'Create SO Script', 'Default Billing Address: ' + orderDetails['defaultBillingAddress'] + ', Set So Billing Address Id: ' + orderDetails['setSoBillAddress'] );
			if( orderDetails['defaultBillingAddress'] )
			{
				objRecord.setValue({ fieldId: 'billaddresslist', value: orderDetails['defaultBillingAddress'] });
			}
			else if( orderDetails['setSoBillAddress'] )
			{
				objRecord.setValue({ fieldId: 'billaddresslist', value: orderDetails['setSoBillAddress'] });
			}
			
			//Create a search for shipment method mapping
			log.audit( 'Create SO Script', 'Default Shipping Method: ' + defaultShipping );
			log.audit( 'Create SO Script', 'WooCommerce Shipping Method: ' + shippingMethod );
			
			if(defaultShipping && defaultShipping != undefined && defaultShipping != null)
			{
				objRecord.setValue({ fieldId: 'shipmethod', value: defaultShipping });
				log.debug( 'Create SO Script', 'Default Shipping Total: ' + orderDetails['shipping_total'] );
				if(orderDetails['shipping_total'])
					objRecord.setValue({ fieldId: 'shippingcost', value: orderDetails['shipping_total'] });
			}
			else if(shippingMethod)
			{
				var shipSearch = search.create({
					type: 'customrecord_woo_shipping_methods_rec',
					filters: [
						[ 'custrecord_woocom_shipping_method', 'contains', shippingMethod.replace('&amp;', '&').replace('&#0174;','®').replace('&#8482;','™') ],
						'and',
						["custrecord_woocom_shipping_ref_rec","anyof",setupRecId ],
						'and',
						[ 'isinactive', 'is', 'F' ]
					],
					columns: [
						search.createColumn({ name: 'custrecord_woocom_shipping_method', label: 'WooCommerce Shipping Method' }),
						search.createColumn({ name: 'custrecord_woocom_ns_shipping_method', label: 'NetSuite Shipping Method' })
					]
				});

				var shipSearch_Result = shipSearch.run();
				var shipFirstResult 	= shipSearch_Result.getRange({ start: 0, end: 1 })[0];
				if(shipFirstResult)
				{
					var NS_ship_method = shipFirstResult.getValue( shipSearch_Result.columns[1] );
					log.audit('Create SO Script', 'NS Shipping Method ID: ' + NS_ship_method);

					if(NS_ship_method)//if shiping menthod exists in NS
					{
						objRecord.setValue({ fieldId: 'shipcarrier', value: 'nonups' });
						objRecord.setValue({ fieldId: 'shipmethod',  value: NS_ship_method });
						log.debug( 'Create SO Script', 'WooCommerce Shipping Total: ' + orderDetails['shipping_total'] );
						if(orderDetails['shipping_total'])
							objRecord.setValue({ fieldId: 'shippingcost', value: orderDetails['shipping_total'] });
					}
					else
					{
						log.error( 'Create SO Script', 'The shipping method - ' + shippingMethod + " is mot mapped in NetSuite's Shipping Method Mapping record." );
						var errorObj 			= {};
						errorObj.name 		= 'Shipping Method Error.';
						errorObj.message 	= 'The shipping method - ' + shippingMethod + " is not mapped in NetSuite's Shipping Method Mapping record.";
						var error 				= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						return error;
					}
				}
				else
				{
					var nsShipRecObj = record.create({ type: 'customrecord_woo_shipping_methods_rec', isDynamic: true });
					nsShipRecObj.setValue({ fieldId: 'custrecord_woocom_shipping_method', value: shippingMethod });
					nsShipRecObj.setValue({ fieldId: 'custrecord_woocom_shipping_ref_rec', value: setupRecId });
					var nsShipRecId 	= nsShipRecObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
					
					log.error( 'Create SO Script', 'The shipping method - ' + shippingMethod + " mapping Record Created By Script Record Id: " + nsShipRecId );
					log.error( 'Create SO Script', 'The shipping method - ' + shippingMethod + " is mot mapped in NetSuite's Shipping Method Mapping record." );
					var errorObj 			= {};
					errorObj.name 		= 'Shipping Method Error.';
					errorObj.message 	= 'The shipping method - ' + shippingMethod + " is not mapped in NetSuite's Shipping Method Mapping record.";
					var error 				= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
					errorArray.push(error);
					return error;
				}
			}//else.....if(defaultShipping)
			
			//Create a search for Payment method mapping
			log.audit( 'Create SO Script', 'Default Payment Method: ' + defaultPayment );
			log.audit( 'Create SO Script', 'WooCommerce Payment Method: ' + paymentMethod +' ,WooCommerce Transaction Id: ' + orderDetails['transaction_id'] );

			if(defaultPayment && defaultPayment != undefined && defaultPayment != null)
			{
				objRecord.setValue({ fieldId: 'paymentmethod', value: defaultPayment });
				objRecord.setValue({ fieldId: 'custbody_woocom_transaction_id', value: orderDetails['transaction_id'] });
			}
			else if(paymentMethod)
			{
				var paymentSearch = search.create({
					type: 'customrecord_woo_payment_methods_rec',
					filters: [
						[ 'custrecord_woocom_payment_method', 'contains', paymentMethod.replace('&amp;', '&').replace('&#0174;','®').replace('&#8482;','™') ],
						'and',
						['custrecord_woocom_payment_ref_rec', 'anyof' , setupRecId ],
						'and',
						[ 'isinactive', 'is', 'F' ]
					],
					columns: [
						search.createColumn({ name: 'custrecord_woocom_payment_method', label: 'WooCommerce Payment Method' }),
						search.createColumn({ name: 'custrecord_woocom_ns_payment_method', label: 'NetSuite Payment Method' })
					]
				});

				var paymentSearch_Result 	= paymentSearch.run();
				var paymentFirstResult 		= paymentSearch_Result.getRange({ start: 0, end: 1 })[0];
				if(paymentFirstResult)
				{
					var NS_payment_method = paymentFirstResult.getValue( paymentSearch_Result.columns[1] );
					log.audit( 'Create SO Script', 'NS Payment Method ID: ' + NS_payment_method );

					if(NS_payment_method)//if payment menthod exists in NS
					{
						objRecord.setValue({ fieldId: 'paymentmethod', value: NS_payment_method });
						objRecord.setValue({ fieldId: 'custbody_woocom_transaction_id', value: orderDetails['transaction_id'] });
					}
					else
					{
						log.error( 'Create SO Script', 'The payment method - ' + paymentMethod + " is not mapped in NetSuite's Payment Method Mapping record" );
						var errorObj 			= {};
						errorObj.name 		= 'Payment Method Error.';
						errorObj.message 	= 'The payment method - ' + paymentMethod + " is not mapped in NetSuite's Payment Method Mapping record.";
						var error 				= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						return error;
					}
				}
				else
				{
					var nsPaymentRecObj = record.create({ type: 'customrecord_woo_payment_methods_rec', isDynamic: true });
					nsPaymentRecObj.setValue({ fieldId: 'custrecord_woocom_payment_method', value: paymentMethod });
					nsPaymentRecObj.setValue({ fieldId: 'custrecord_woocom_payment_ref_rec', value: setupRecId });
					var nsPaymentRecId 	= nsPaymentRecObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
					
					log.error( 'Create SO Script', 'The Payment method - ' + paymentMethod + " mapping Record Created By Script Record Id: " + nsPaymentRecId );
					log.error( 'Create SO Script', 'The payment method - ' + paymentMethod + " is not mapped in NetSuite's Payment Method Mapping record" );
					var errorObj 			= {};
					errorObj.name 		= 'Payment Method Error.';
					errorObj.message 	= 'The payment method - ' + paymentMethod + " is not mapped in NetSuite's Payment Method Mapping record.";
					var error 				= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
					errorArray.push(error);
					return error;
				}
			}
			//Tax Rate Code Mapping.............
			log.debug('Create SO Script','Oder Tax line: '+orderDetails['tax_lines']+', Tax Rate Code Mapping: '+orderDetails['taxRateCodeMap'])
			if( orderDetails['taxRateCodeMap'] && ( orderDetails['tax_lines'] && orderDetails['tax_lines'] != 'NaN' ) )
			{
				var taxLinesArray = [];
				taxLinesArray = JSON.parse( orderDetails['tax_lines'] );
				if( taxLinesArray && taxLinesArray.length > 0)
				{
					var taxRateCodeArry = [];
					log.debug('create so script ','Tax Items Length:' + taxLinesArray.length)
					for( var taxIndex = 0; taxLinesArray.length > taxIndex; taxIndex++ )
					{
						var taxId				= taxLinesArray[taxIndex].id;
						var taxRateCode 		= taxLinesArray[taxIndex].rate_code;
						taxRateCodeArry.push(taxRateCode)
					
						log.debug({ title: 'create so script ',details:'WooCommerce Tax Id: '+taxId+', rate Code: '+taxRateCode+', taxRateCodeArry: '+ taxRateCodeArry.length});
						if( taxRateCodeArry.length > 0 )
						{
							var taxCodeSearch = search.create({
								type: 'customrecord_woo_tax_rate_code_mapping',
								filters: [
									[ 'custrecord_woocommerce_tax_rate_code', 'contains', taxRateCode/* .replace('&amp;', '&').replace('&#0174;','®').replace('&#8482;','™') */ ],
									'and',
									["custrecord_reference","anyof",setupRecId ],//.toString()
									'and',
									[ 'isinactive', 'is', 'F' ]
								],
								columns: [
									search.createColumn({ name: 'custrecord_woocommerce_tax_rate_code', label: 'WooCommerce Tax Rate Code' }),
									search.createColumn({ name: 'custrecord_ns_tax_code', label: 'NetSuite Tax Rate Code' })
								]
							});
							var taxCode_Result = taxCodeSearch.run();
							//log.debug({title : 'Create order',details: 'taxCode_Result: '+JSON.stringify(taxCode_Result)});
							var taxCodeFirstResult 	= taxCode_Result.getRange({ start: 0, end: 1 })[0];
							//log.debug({title : 'Create order',details: 'taxCode_Result: '+JSON.stringify(taxCodeFirstResult)});
							if( taxCodeFirstResult )
							{
								NS_TaxId 		= taxCodeFirstResult.getValue(taxCodeFirstResult.columns[1]);
								var NS_TaxIdText 	= taxCodeFirstResult.getText(taxCodeFirstResult.columns[1]);
								log.audit('create so script ','Ns Tax Item Id: '+ NS_TaxId+ ', Ns Tax Item Name: '+ NS_TaxIdText );
								if( NS_TaxId )//if Tax Rate Code exists in NS
								{
									//taxcode = NS_TaxId;
                                    
									objRecord.setValue({ fieldId: 'istaxable',  value: true });
									objRecord.setValue({ fieldId: 'taxitem',  value: NS_TaxId });
									log.debug( 'Create SO Script', 'WooCommerce Tax Rate Code: ' + taxRateCode + ', Is mapped With The NetSuite Tax Item: '+ NS_TaxIdText );
								}
								else
								{
									log.error( 'Create SO Script', 'The Tax Code - ' + taxRateCode + " is not mapped in The NetSuite's Tax Rate Code Mapping record." );
									var errorObj 		= {};
									errorObj.name 		= 'Tax Rate Code Error.';
									errorObj.message 	= 'The Woo Tax Rate Code - ' + taxRateCode + " is not mapped in The NetSuite's Tax Rate Code Mapping record.";
									var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
									return error;
								}
							}
							else
							{
								var nsTaxRateRecObj = record.create({ type: 'customrecord_woo_tax_rate_code_mapping', isDynamic: true });
								nsTaxRateRecObj.setValue({ fieldId: 'custrecord_woocommerce_tax_rate_code', value: taxRateCode });
								nsTaxRateRecObj.setValue({ fieldId: 'custrecord_reference', value: setupRecId });
								var nsTaxRateRecId 	= nsTaxRateRecObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
								
								log.debug({ title:'create Order',details: 'NetSuite Tax Rate Code Record Created With Id: '+ nsTaxRateRecId })
								log.error( 'Create SO Script', 'The Tax Code - ' + taxRateCode + " is not mapped in The NetSuite's Tax Rate Code Mapping record." );
								var errorObj 		= {};
								errorObj.name 		= 'Tax Rate Code Error.';
								errorObj.message 	= 'The Woo Tax Rate Code - ' + taxRateCode + " is not mapped in The NetSuite's Tax Rate Code Mapping record.";
								var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
								return error;
							}
						}//if(taxRateCode)
					}//for( var taxIndex = 0;orderLineItems.taxesArray.length > taxIndex;taxIndex++)
				}//else.....if(defaultTaxItem)
			}
			//Changing date to supported format for NS
			var created_date 	= orderDetails['date_created'];
			var date_value 		= created_date.split('T');
			var trans_date 		= format.format({ value: date_value[0], type: format.Type.DATE });
			var dt 						= trans_date.split('-')
			var day 					= dt[2];
			var month 				= dt[1];
			var year 					= dt[0];
			var string_date 	= month + '/' + day + '/' + year;
			var dt 						= new Date(string_date);
			//log.debug( 'Create SO Script', 'dt: ' + dt );
			//Setting the date
			if(string_date)
				objRecord.setValue({ fieldId: 'trandate', value: dt });
			
			//Set Line Items
			log.audit('create so script ','Line Items Length:' + orderLineItems.lineItemsArray.length)
			for(var lineItemIndex = 0;orderLineItems.lineItemsArray.length >  lineItemIndex; lineItemIndex++)
			{
				var itemObj = {};
				var orderItem 		= orderLineItems.lineItemsArray[lineItemIndex];
				var sku 	= orderItem.sku;
				//log.debug( 'Create SO Script', 'NetSuite Item ID: ' + orderItem.NS_ItemId );
				if( orderItem.NS_ItemId || !orderDetails['reprocess_Chk'])
				{
					itemObj.item = Number(orderItem.NS_ItemId);
				}
				else
				{
					itemObj.item 	= Number(orderItem.NS_ItemId);
					errorStatus 	= 'T';
					errorMsg 		= 'No Item Found in the Error Record Line level: ' + sku;
					log.error( 'Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex );
					//return errorMsg;
				}
				//log.debug( 'Create SO Script', 'Quantity: ' + orderItem.quantity ); //quantity
				itemObj.quantity = orderItem.quantity;
				
				//description
				if(orderItem.description != '' && orderItem.description != undefined)
					itemObj.description = orderItem.description;

				itemObj.price 	= -1;//custom Price Level;
				
				//log.debug( 'Create SO Script', 'Rate per Item: ' + Number(orderItem.rate));
				itemObj.rate 				= Number(orderItem.rate);
				
				//log.debug( 'Create SO Script', 'Amount: ' + Number(orderItem.amount));
				itemObj.amount 				= Number(orderItem.amount);
				
				//log.debug( 'Create SO Script', 'Taxcode: ' + taxcode );
                if(Number(orderItem.NS_ItemId) == 41395 || orderItem.NS_ItemId == '41395'){
                    log.debug( 'Create SO Script', 'Gift Card Taxcode: ' + 19916 );
                    itemObj.taxcode = 19916;
                }else if(Number(orderItem.NS_ItemId) != 41429){
                    itemObj.taxcode 	= NS_TaxId;
                }
                
				//log.debug( 'Create SO Script', 'Woo Product ID : ' + orderItem.product_id ); //Woo line id
				itemObj.custcol_woocommerce_product_line_id 	= orderItem.product_id;
				
				//log.debug( 'Create SO Script', 'Woo Variation ID: ' + orderItem.variation_id ); //Woo variation id
				itemObj.custcol_woocommerce_item_variation_id 	= orderItem.variation_id;
				
				//log.debug( 'Create SO Script', 'Location: ' + orderDetails['itemLocation'] );
				if(orderDetails['itemLocation'])
				{
					itemObj.location 				= orderDetails['itemLocation'];
				}
				
				setLineItems( objRecord,itemObj);
				//log.debug('Create SO Script','Line Item Added In The sales Order')
			}
			//Setting Coupons information
			if( orderDetails['couponsCheckbox'] )
			{
				if(discountItem && orderLineItems.couponsArray.length > 0 )
				{
					log.audit('create so script ','Setting Coupon Items')
					log.audit('create so script ','Coupon Items Length:' + orderLineItems.couponsArray.length)
					if( orderDetails['bodyLevelDiscount'] && orderLineItems.couponsArray.length == 1)
					{
						objRecord.setValue({ fieldId: 'discountitem', value: Number(orderDetails['discountItem']) });
						objRecord.setValue({ fieldId: 'custbody_woocommerce_coupon_code', value: orderLineItems.couponsArray[0].code });
						objRecord.setValue({ fieldId: 'discountrate', value: -Number(orderLineItems.couponsArray[0].amount) });
					}
					else
					{
						/*adding subtotal item in line level.....
						if(orderLineItems.couponsArray.length >=2)
						{
							log.debug('create so script ','adding Subtotal Item')
							objRecord.selectNewLine({ sublistId: 'item' });
							objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value:-2 });
							objRecord.commitLine({ sublistId: 'item' });
							log.debug('create so script ','added Subtotal Item')
						}*/
						for(var couponIndex = 0; orderLineItems.couponsArray.length > couponIndex ; couponIndex++)
						{
							var discountobj = {};
							discountobj.item 						= Number(orderDetails['discountItem']);
							discountobj.description 				= orderLineItems.couponsArray[couponIndex].name;
							discountobj.price 						= -1;
							discountobj.rate 						= -parseFloat(Number(orderLineItems.couponsArray[couponIndex].rate)).toFixed(2);
							discountobj.amount 						= -parseFloat(Number(orderLineItems.couponsArray[couponIndex].amount)).toFixed(2);
							discountobj.taxcode 					= NS_TaxId;
							
							setLineItems( objRecord,discountobj);
						}
					}//else
				} //if(discountItem && orderLineItems.couponsArray.length > 0)
				else
				{
					if(!discountItem)
					{
						log.error( 'Create SO Script', 'Discount item not set in setup record' );
						var errorObj 		= {};
						errorObj.name 		= 'Discount Item Error.';
						errorObj.message 	= 'Please set Discount item in setup record.';
						var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						//return error;
					}
					else
						log.audit('Create SO Script','Discount Items Array Does not Exist');
				}
			}
			else
			{
				log.audit('Create SO Script','Discount Items Does not Exist');
			}
			//setting eGift card information
			if(orderDetails['eGiftCardCheckbox'] )
			{
				if(eGiftCardRedemItem && orderLineItems.eGiftCardArray.length > 0 )
				{
					log.audit('create so script ','Setting eGiftCard Items')
					log.audit('create so script ','eGiftCard Items Length:' + orderLineItems.eGiftCardArray.length);
					for(var egiftIndex = 0; orderLineItems.eGiftCardArray.length > egiftIndex ; egiftIndex++)
					{
						var eGiftobj = {};
						eGiftobj.item 					= Number(orderLineItems.eGiftCardArray[egiftIndex].Ns_eGiftCardId);
						eGiftobj.description 			= orderLineItems.eGiftCardArray[egiftIndex].name;
						eGiftobj.price 					= -1;
						eGiftobj.rate					= -parseFloat(Number(orderLineItems.eGiftCardArray[egiftIndex].rate)).toFixed(2);
						eGiftobj.amount					= -parseFloat(Number(orderLineItems.eGiftCardArray[egiftIndex].amount)).toFixed(2);
						eGiftobj.taxcode 				= 19916;
						
						setLineItems( objRecord,eGiftobj);
					}
				}
				else
				{
					if(!eGiftCardRedemItem)
					{
						log.error( 'Create SO Script', 'eGift Card item not set in setup record' );
						var errorObj 		= {};
						errorObj.name 		= 'eGift Card Item Error.';
						errorObj.message 	= 'Please set eGift Card item in setup record.';
						var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						//return error;
					}
					else
						log.audit('Create SO Script','eGift Card Items Array Does not Exist');
				}
			}
			else
			{
				log.audit('Create SO Script','eGift Card Does Not Exist');
			}
			//Setting Feeline Information
			if( orderDetails['feeLineCheckbox'] )
			{
				if( feeLineItem && orderLineItems.feeLineArray.length > 0 )
				{
					log.audit('create so script ','Setting FeeLine Items')
					log.audit('create so script ','Feeline Items Length:' + orderLineItems.feeLineArray.length)
					for(var feeLineIndex = 0; feeLineIndex < orderLineItems.feeLineArray.length; feeLineIndex++)
					{
						if(orderLineItems.feeLineArray[feeLineIndex].amount )
						{
							var feeLineobj = {};
							feeLineobj.item 			= Number(feeLineItem);
							feeLineobj.description 		= orderLineItems.feeLineArray[feeLineIndex].name;
							feeLineobj.quantity 		= parseInt(1);
							feeLineobj.price 			= -1;
							feeLineobj.rate 			= parseFloat(orderLineItems.feeLineArray[feeLineIndex].rate).toFixed(2);
							feeLineobj.amount 			= parseFloat(orderLineItems.feeLineArray[feeLineIndex].amount).toFixed(2);
							//feeLineobj.taxcode 			= -7;
							
							setLineItems( objRecord,feeLineobj);
						}
						else
							log.audit( 'Create SO Script', 'Feeline item not set as amount is ' + orderLineItems.feeLineArray[feeLineIndex].feeLine_total );
					}
				}
				else
				{
					if(!feeLineItem)
					{
						log.error( 'Create SO Script', 'Feeline item not set in setup record' );
						var errorObj 		= {};
						errorObj.name 		= 'Feeline Item Error.';
						errorObj.message 	= 'Please set Feeline item in setup record.';
						var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						//return error;
					}
					else
						log.audit('Create SO Script','FeeLine Items Array Does not Exist');
				}
			}
			else
			{
				log.audit('Create SO Script','FeeLine Items Does not Exist');
			}
			// Setting Stripe Charge Item
			if( orderDetails['stripeChargeCheckBox'] )
			{
				if( stripeChargeItem && orderLineItems.stripeObj )
				{
					var stripeChargeObj = {};
					stripeChargeObj.item 			= Number(stripeChargeItem);
					stripeChargeObj.description 	= orderLineItems.stripeObj.description;
					stripeChargeObj.price 			= -1;
					stripeChargeObj.rate 			= -Number(orderLineItems.stripeObj.amount);
					stripeChargeObj.amount 			= -Number(orderLineItems.stripeObj.amount);
					
					setLineItems( objRecord, stripeChargeObj );
				}
				else
				{
					if( !stripeChargeItem )
					{
						log.error( 'Create SO Script', 'Stripe Charge item not set in setup record' );
						var errorObj 		= {};
						errorObj.name 		= 'Stripe Charge Item Error.';
						errorObj.message 	= 'Please set Stripe Charge item in setup record.';
						var error 			= 'Error in Creating SO. ' + '\nError: ' + errorObj.name + ' ' + '\nDetails: ' + errorObj.message;
						errorArray.push(error);
						//return error;
					}
					else
						log.audit('Create SO Script','Stripe Charge Items Array Does not Exist');
				}
			}
			else
			{
				log.audit('Create SO Script','Stripe Charge Does Not Exist');
			}
            // setting Shipping Tax code
            objRecord.setValue({ fieldId: 'shippingtaxcode',  value: NS_TaxId });
			//To use taxcode set this as true and comment line level addition to use auto addition of tax code.
			//objRecord.setValue({ fieldId: 'istaxable', value: false });
			log.audit( 'Create SO Script', "Total Tax Amount: " + orderDetails['total_tax']+', Tax Item Id: '+defaultTaxItem+', Use Standard Taxes: '+orderDetails['standardTaxes'] );
			if( !orderDetails['standardTaxes'] && defaultTaxItem && !orderDetails['taxRateCodeMap'])
			{
				log.audit( 'Create SO Script', 'Tax Item Id: ' + defaultTaxItem );
				var taxLineobj = {};
				taxLineobj.item 			= Number(defaultTaxItem);
				taxLineobj.quantity 		= 1;
				taxLineobj.price 			= -1;
				taxLineobj.rate 			= Number(orderDetails['total_tax']);
				taxLineobj.amount 			= Number(orderDetails['total_tax']);
				//taxLineobj.taxcode 			= -7;
				
				setLineItems( objRecord,taxLineobj);
			}//if(!orderDetails['standardTaxes'] )
			else
			{
				log.audit({ title: 'Create SO Script',details: 'This Account Using NetSuite Standard Taxes'})
			}
			//Set created by script checkbox
			objRecord.setValue({ fieldId: 'custbody_woocom_order_created_by_scrip', value: true });
			objRecord.setValue({ fieldId: 'custbody_setup_record', value: setupRecId });
			//objRecord.setValue({ fieldId: 'custbody_woocom_config_rec', value: orderDetails['order_id'] });
			//objRecord.setValue({ fieldId: 'tobeemailed', value: false });
			if(errorArray.length > 0)
			{
				var strError = '';
				for(errorIndex = 0; errorArray.length > errorIndex; errorIndex++)
				{
					strError += errorArray[errorIndex];
				}
				return strError;
			}
			else
			{
				//return false;
				var recordId =  objRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
				log.audit({ title: 'Create SO Script', details: 'Sales Order Created with Record ID: ' + recordId });
				return recordId;
			}
		}
		catch(e)
		{
			log.error( 'Error Occured During Sales Order Record Creation', 'Error: ' + e.name + '\nDetails: ' + e.message );

			var errorObj 			= {};
			errorObj.name 			= e.name;
			errorObj.message 		= e.message;
			var error 				= 'Error in Creating SO ' + '\nError: ' + errorObj.name + '\nDetails: ' + errorObj.message;
			return error;
		}
		finally
		{
			log.audit( 'WooCommerce Create Sales Order Script', 'Create Sales Order Script Ends' );
		}
	}
	function setLineItems( objRecord,obj)
	{
		var fieldIdArray = Object.keys(obj);
		objRecord.selectNewLine({ sublistId: 'item' });
		for (var fieldIndex = 0; fieldIdArray.length>fieldIndex ;fieldIndex++)
		{
			var key = fieldIdArray[fieldIndex];
			var value = obj[key];
			log.debug({title:'Create SO Script',details:key +' : '+value})
			objRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: key, value: value });
		}
		objRecord.commitLine({ sublistId: 'item' });
		//return true;
	}
	return{
		createSalesOrder: createSalesOrder
	};
});