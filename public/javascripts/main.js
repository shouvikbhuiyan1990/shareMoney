var app = angular.module('homeCalc',[]);

app.controller('homeCalcCtrl',['$scope','$http','$rootScope','dataFactory',function($scope,$http,$rootScope,dataFactory){
    
    var ctx = document.getElementById("myChart").getContext("2d");
    
	var payableObj = {payee : '',payable : 0, payer: ''};

	$scope.payableArr = [];

	var giveArr =[], takeArr = [];

	$http.get('/homecalc/find/all').success(function(data){
		$scope.record = data;
		if(data.length == 0){
			$rootScope.$broadcast('/homecalc/update/noRrecord',{})
		}
		else
			$scope.noRrecords = false;
	})

	$scope.addMoreRecords = function(){
		var newRecord = {name:'',total:0,amount:0,newRecord:true};
		$scope.noRrecords = false;
        $scope.chartDisplay = false;
		$scope.showCalculation = false;
		//$scope.record.push(newRecord);
		$http.post('/homecalc/record/add',newRecord).success(function(data){
			dataFactory.updateViewAll();
		})
	};

	$scope.generateExpenseReport = function(){
        var dataArr = [],
            dataObj = {},
            noPayObj = {};
        $scope.noPay = [];
        $scope.chartDisplay = true;
		$http.get('/homecalc/find/all').success(function(data){
            data.map(function(value,index){
                dataObj = {};
                dataObj.value = data[index].total; 
                dataObj.color =  "#F7464A";
                dataObj.highlight = "#FF5A5E";
                dataObj.label = data[index].name;
                dataArr.push(dataObj);      
                if(data[index].total == 0){
                    noPayObj.name = data[index].name;
                }
            }); 
            if(noPayObj.hasOwnProperty('name')){
                $scope.noPay.push(noPayObj);
                $scope.noPayClass = 'active';
            }
            $('#myChart').remove();
            $('.chart-container').append('<canvas id="myChart" width="375" height="375" style="width: 250px; height: 250px;"></canvas>');
            ctx = document.getElementById("myChart").getContext("2d");
            var myNewChart = new Chart(ctx).Doughnut(dataArr);
			modularFunctionality.splitArr(data);            
		});
		takeArr.length = 0;
		giveArr.length = 0;
		$scope.payableArr.length = 0;
		$scope.showCalculation = true;
	};

	$scope.deleteAll = function(){
        $scope.chartDisplay = false;
		$http.post('/homecalc/record/delete/all',{}).success(function(data){
			dataFactory.updateView();
			$rootScope.$broadcast('/homecalc/update/noRrecord',{})
		});
	};

	$scope.$on('/homecalc/update/view',function(e,data){
		$scope.record = data;
	});

	$scope.$on('/homecalc/update/viewAll',function(e,data){
		$scope.record = data;
	});

	$scope.$on('/homecalc/update/noRrecord',function(e,data){
		$scope.noRrecords = true;
	});

	var modularFunctionality = {
		splitArr : function(data){
			var maxValue 
			    ,total = 0
				,avg;
			data.map(function(value,index){
				total = total + value.total;
			});
			avg = total/data.length;
			data.map(function(value,index){
				if(value.total === avg){
					$scope.payableArr.push({payee:value.name,payable:0,payer:''});
				}
				else if(value.total > avg){
					value.total = value.total-avg;
					takeArr.push(value);
				}
				else{
					value.total = avg - value.total;
					giveArr.push(value);
				}
			});
			var j = takeArr.length;
			for(var i=0; i<j ;i++){
				var maxTake = this.selectMax(takeArr).index;
				var maxGive = this.selectMax(giveArr).index;
				var remain = 2;
				while(takeArr[maxTake] && takeArr[maxTake].total > 0 && remain>0){
					maxGive = this.selectMax(giveArr).index;
					remain = takeArr[maxTake].total - giveArr[maxGive].total;
					
					if(remain < 0){
						$scope.payableArr.push({payee:takeArr[maxTake].name,payable:takeArr[maxTake].total,payer:giveArr[maxGive].name});
						giveArr[maxGive].total = giveArr[maxGive].total - takeArr[maxTake].total;
						takeArr.splice(maxTake,1);
					}
					else{
						$scope.payableArr.push({payee:takeArr[maxTake].name,payable:giveArr[maxGive].total,payer:giveArr[maxGive].name});
						takeArr[maxTake].total = takeArr[maxTake].total - giveArr[maxGive].total;
						giveArr.splice(maxGive,1);
					}
				}
			}
		},
		selectMax : function(data){
			var maxValue = data[0].total;
			var maxIndex;
			data.map(function(value,index){
				if(maxValue < value.total){
					maxValue = value.total;
					maxIndex = index;
				}
				else
					maxIndex = 0;
			});
			return { 'index' : maxIndex , 'value' : maxValue};
		}
	}

}]);

app.directive('personRecord',['$http','$rootScope','dataFactory',function(http,rootScope,dataFactory){
	return{
		restrict : 'AE',
		templateUrl : 'views/template.html',
		link : function(scope,ele,attr){
			var reqObjct = {};
			var deleteObj = {};
			ele.find('.btn-delete').bind('click',function(e){
				e.preventDefault();
				deleteObj.id = attr.id;
                scope.chartDisplay = false;
				http.post('/homecalc/record/delete/all',deleteObj).success(function(data){
					dataFactory.updateView();
					http.get('/homecalc/find/all').success(function(Recdata){
						if(Recdata.length == 0){
							rootScope.$broadcast('/homecalc/update/noRrecord',{})
						}
					});
				});
			})
			ele.bind('submit',function(){
				scope.errDisplay = true;
				reqObjct.id = attr.id;
				reqObjct.name = scope.name;
				var nameObj = {};
				nameObj.name = scope.name;
				http.post('/homecalc/record/findone',reqObjct).success(function(data){
					http.post('/homecalc/record/findDuplictae',nameObj).success(function(nameData){
						if(data.newRecord == false ||  nameData.length == 0){							
							if(scope.amountOption == 'add'){
								reqObjct.amount = parseInt(scope.amount) + parseInt(data.total);
							}
							else{
								reqObjct.amount = parseInt(data.total) - parseInt(scope.amount);
							}
							http.post('/homecalc/record/update',reqObjct).success(function(innerData){
								dataFactory.updateView();
							})
						}
						else{
							scope.name = '';
							scope.amount = '';
							scope.$parent.errDisplay = true;
						}
					});
				})
				
				
			})
		}
	}
}]);


app.factory('dataFactory',['$rootScope','$http',function($rootScope,$http){
	return{
		updateView : function(){
				$http.get('/homecalc/find/all').success(function(data){
				$rootScope.$broadcast('/homecalc/update/view',data);
			});
		},
		updateViewAll : function(){
			$http.get('/homecalc/find/all/space').success(function(data){
				$rootScope.$broadcast('/homecalc/update/viewAll',data);
			});
		}
	}
}])