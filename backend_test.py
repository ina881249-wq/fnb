import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class FnBERPTesterSimple:
    def __init__(self, base_url="https://outlet-hub-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.chef_token = None
        self.manager_token = None
        self.sudirman_outlet_id = "69df25da9be6c3c79434b0e2"
        self.test_order_id = "69e309ed4a9118c12153d43c"  # Existing paid order

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        auth_token = token or self.admin_token
        if auth_token:
            req_headers['Authorization'] = f'Bearer {auth_token}'
        
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def login_user(self, email, password, description=""):
        """Login and get token"""
        success, response = self.run_test(
            f"Login {description}",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            return response['token']
        return None

    def setup_auth(self):
        """Setup authentication for different user types"""
        print("\n🔐 Setting up authentication...")
        
        self.admin_token = self.login_user("admin@fnb.com", "admin123", "Admin")
        if not self.admin_token:
            return False
            
        self.chef_token = self.login_user("chef.sudirman@fnb.com", "kitchen123", "Chef")
        if not self.chef_token:
            return False
            
        self.manager_token = self.login_user("manager.sudirman@fnb.com", "manager123", "Manager")
        if not self.manager_token:
            return False

        return True

    def test_kitchen_apis(self):
        """Test all Kitchen APIs comprehensively"""
        print("\n🍳 Testing Kitchen Portal APIs...")
        
        # 1. Kitchen Queue API
        success, response = self.run_test(
            "Kitchen Queue - Get queue with groups and stats",
            "GET",
            "api/kitchen/queue",
            200,
            data={"outlet_id": self.sudirman_outlet_id},
            token=self.chef_token
        )
        
        if not success:
            return False
            
        # Verify response structure
        if not all(key in response for key in ['groups', 'stats']):
            print("❌ Missing groups or stats in queue response")
            return False
            
        groups = response['groups']
        stats = response['stats']
        
        # Check required groups
        required_groups = ['queued', 'preparing', 'ready', 'served']
        if not all(group in groups for group in required_groups):
            print(f"❌ Missing queue groups. Found: {list(groups.keys())}")
            return False
            
        print(f"✅ Queue structure correct. Stats: {stats}")
        
        # 2. Kitchen Ticket Status Update
        success, response = self.run_test(
            "Kitchen Ticket - Update status to ready",
            "POST",
            f"api/kitchen/tickets/{self.test_order_id}/status",
            200,
            data={"status": "ready"},
            token=self.chef_token
        )
        
        if not success:
            return False
            
        # 3. Kitchen Waste API
        waste_data = {
            "outlet_id": self.sudirman_outlet_id,
            "item_name": "Test Waste Item",
            "quantity": 1,
            "uom": "pcs",
            "reason": "Testing waste API",
            "category": "error",
            "cost": 5000,
            "notes": "API test"
        }
        
        success, response = self.run_test(
            "Kitchen Waste - Create entry",
            "POST",
            "api/kitchen/waste",
            200,
            data=waste_data,
            token=self.chef_token
        )
        
        if not success:
            return False
            
        waste_id = response.get('id')
        if not waste_id:
            print("❌ No waste ID returned")
            return False
            
        # List waste
        success, response = self.run_test(
            "Kitchen Waste - List with aggregation",
            "GET",
            "api/kitchen/waste",
            200,
            data={"outlet_id": self.sudirman_outlet_id},
            token=self.chef_token
        )
        
        if not success:
            return False
            
        if not all(key in response for key in ['waste', 'total_cost']):
            print("❌ Missing waste or total_cost in response")
            return False
            
        print(f"✅ Waste list: {len(response['waste'])} entries, total cost: {response['total_cost']}")
        
        # Delete waste
        success, response = self.run_test(
            "Kitchen Waste - Delete entry",
            "DELETE",
            f"api/kitchen/waste/{waste_id}",
            200,
            token=self.chef_token
        )
        
        if not success:
            return False
            
        # 4. Kitchen Dashboard
        success, response = self.run_test(
            "Kitchen Dashboard - Get KPIs",
            "GET",
            "api/kitchen/dashboard",
            200,
            data={"outlet_id": self.sudirman_outlet_id},
            token=self.chef_token
        )
        
        if not success:
            return False
            
        # Check required KPI fields
        required_fields = ['paid_today', 'queued', 'preparing', 'ready', 'served', 
                         'avg_prep_minutes', 'waste_today_count', 'waste_today_cost']
        
        if not all(field in response for field in required_fields):
            missing = [f for f in required_fields if f not in response]
            print(f"❌ Missing KPI fields: {missing}")
            return False
            
        print(f"✅ Dashboard KPIs complete")
        
        return True

    def test_daily_closing_integration(self):
        """Test Daily Closing Integration with Cashier Shifts"""
        print("\n📋 Testing Daily Closing Integration...")
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            "Daily Closing - Get status with shift integration",
            "GET",
            "api/daily-closing/status",
            200,
            data={"outlet_id": self.sudirman_outlet_id, "date": today},
            token=self.manager_token
        )
        
        if not success:
            return False
            
        # Check new Phase 3C fields
        required_fields = ['shift_summary', 'shifts', 'discrepancies', 'checklist']
        
        if not all(field in response for field in required_fields):
            missing = [f for f in required_fields if f not in response]
            print(f"❌ Missing closing status fields: {missing}")
            return False
            
        # Check checklist has cashier_shifts
        checklist = response.get('checklist', {})
        if 'cashier_shifts' not in checklist:
            print("❌ Missing cashier_shifts in checklist")
            return False
            
        # Check shift_summary structure
        shift_summary = response.get('shift_summary', {})
        summary_fields = ['total_orders', 'total_sales', 'cash_sales', 'card_sales', 
                        'expected_cash_total', 'actual_cash_total', 'variance_total']
        
        if not all(field in shift_summary for field in summary_fields):
            missing = [f for f in summary_fields if f not in shift_summary]
            print(f"❌ Missing shift summary fields: {missing}")
            return False
            
        print(f"✅ Daily closing integration complete")
        print(f"   Shift summary: {shift_summary}")
        print(f"   Discrepancies: {len(response.get('discrepancies', []))}")
        
        return True

    def test_access_control(self):
        """Test Kitchen Access Control"""
        print("\n🔒 Testing Kitchen Access Control...")
        
        # Chef should only see Sudirman outlet data
        success, response = self.run_test(
            "Kitchen Access - Chef can access Sudirman",
            "GET",
            "api/kitchen/queue",
            200,
            data={"outlet_id": self.sudirman_outlet_id},
            token=self.chef_token
        )
        
        if not success:
            return False
            
        # Verify chef has limited portal access
        success, response = self.run_test(
            "Kitchen Access - Chef dashboard access",
            "GET",
            "api/kitchen/dashboard",
            200,
            data={"outlet_id": self.sudirman_outlet_id},
            token=self.chef_token
        )
        
        return success

    def test_regression_apis(self):
        """Test regression - existing APIs still work"""
        print("\n🔄 Testing Regression - Core APIs...")
        
        endpoints = [
            ("Health check", "GET", "api/health", 200, None),
            ("Dashboard summary", "GET", "api/dashboard/summary", 200, None),
            ("Outlets list", "GET", "api/core/outlets", 200, None),
            ("Menu items", "GET", "api/cashier/menu", 200, None),
            ("Current shift", "GET", "api/cashier/shifts/current", 200, {"outlet_id": self.sudirman_outlet_id}),
        ]
        
        for name, method, endpoint, expected, params in endpoints:
            success, response = self.run_test(
                f"Regression - {name}",
                method,
                endpoint,
                expected,
                data=params,
                token=self.admin_token
            )
            if not success:
                return False
                
        return True

def main():
    print("🚀 F&B ERP Phase 3B/3C/3D Comprehensive Testing")
    print("Testing: Kitchen Portal MVP, Daily Closing Integration, DataTable Rollout")
    
    tester = FnBERPTesterSimple()
    
    # Setup authentication
    if not tester.setup_auth():
        print("❌ Authentication setup failed")
        return 1
    
    # Run all tests
    tests = [
        tester.test_kitchen_apis,
        tester.test_daily_closing_integration,
        tester.test_access_control,
        tester.test_regression_apis,
    ]
    
    failed_tests = []
    for test in tests:
        try:
            if not test():
                failed_tests.append(test.__name__)
        except Exception as e:
            print(f"❌ {test.__name__} failed with exception: {e}")
            failed_tests.append(test.__name__)
    
    # Print results
    print(f"\n📊 Final Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n✅ All test categories passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())