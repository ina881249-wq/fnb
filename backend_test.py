#!/usr/bin/env python3
"""
F&B ERP Backend API Testing Suite
Tests all major endpoints for the F&B Financial Control Platform
"""

import requests
import sys
import json
from datetime import datetime, timedelta

class FnBERPTester:
    def __init__(self, base_url="https://doc-system-build-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.outlet_ids = []
        self.account_ids = []
        self.item_ids = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
            self.failed_tests.append({"test": test_name, "details": details})

    def make_request(self, method, endpoint, data=None, params=None, expected_status=200):
        """Make API request with authentication"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=10)
            
            success = response.status_code == expected_status
            return success, response.json() if success else response.text, response.status_code
        except Exception as e:
            return False, str(e), 0

    def test_health_check(self):
        """Test health endpoint"""
        success, data, status = self.make_request('GET', 'health')
        self.log_result("Health Check", success and data.get('status') == 'healthy')

    def test_login(self, email, password):
        """Test login functionality"""
        success, data, status = self.make_request('POST', 'auth/login', {
            'email': email,
            'password': password
        })
        
        if success and 'token' in data:
            self.token = data['token']
            self.user_data = data['user']
            self.log_result(f"Login ({email})", True)
            return True
        else:
            self.log_result(f"Login ({email})", False, f"Status: {status}, Response: {data}")
            return False

    def test_get_me(self):
        """Test get current user info"""
        success, data, status = self.make_request('GET', 'auth/me')
        self.log_result("Get User Info", success and 'user' in data)

    def test_get_portals(self):
        """Test get available portals"""
        success, data, status = self.make_request('GET', 'auth/portals')
        self.log_result("Get Portals", success and isinstance(data, list))

    def test_dashboard_summary(self):
        """Test dashboard summary"""
        success, data, status = self.make_request('GET', 'dashboard/summary')
        expected_keys = ['outlets_count', 'users_count', 'items_count', 'pending_approvals']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Dashboard Summary", success and has_keys)

    def test_finance_accounts(self):
        """Test finance accounts endpoints"""
        # List accounts
        success, data, status = self.make_request('GET', 'finance/accounts')
        if success and 'accounts' in data:
            # Check if accounts have the right structure
            accounts = data['accounts']
            if accounts:
                # Use '_id' or 'id' depending on what's available
                first_acc = accounts[0]
                id_field = '_id' if '_id' in first_acc else 'id'
                self.account_ids = [acc[id_field] for acc in accounts[:3]]
            self.log_result("List Finance Accounts", True)
        else:
            self.log_result("List Finance Accounts", False, f"Status: {status}")

        # Test finance dashboard
        success, data, status = self.make_request('GET', 'finance/dashboard')
        expected_keys = ['balance_by_type', 'recent_movements', 'total_bank_balance']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Finance Dashboard", success and has_keys)

    def test_cash_movements(self):
        """Test cash movements"""
        success, data, status = self.make_request('GET', 'finance/cash-movements')
        self.log_result("List Cash Movements", success and 'movements' in data)

    def test_inventory_items(self):
        """Test inventory items"""
        # List items
        success, data, status = self.make_request('GET', 'inventory/items')
        if success and 'items' in data:
            items = data['items']
            if items:
                # Use '_id' or 'id' depending on what's available
                first_item = items[0]
                id_field = '_id' if '_id' in first_item else 'id'
                self.item_ids = [item[id_field] for item in items[:3]]
            self.log_result("List Inventory Items", True)
        else:
            self.log_result("List Inventory Items", False, f"Status: {status}")

        # List categories
        success, data, status = self.make_request('GET', 'inventory/categories')
        self.log_result("List Item Categories", success and 'categories' in data)

    def test_stock_on_hand(self):
        """Test stock on hand"""
        success, data, status = self.make_request('GET', 'inventory/stock')
        self.log_result("List Stock on Hand", success and 'stock' in data)

    def test_stock_movements(self):
        """Test stock movements"""
        success, data, status = self.make_request('GET', 'inventory/stock-movements')
        self.log_result("List Stock Movements", success and 'movements' in data)

    def test_inventory_dashboard(self):
        """Test inventory dashboard"""
        success, data, status = self.make_request('GET', 'inventory/dashboard')
        expected_keys = ['total_items', 'total_stock_value', 'low_stock_count']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Inventory Dashboard", success and has_keys)

    def test_reports(self):
        """Test reports endpoints"""
        # P&L Report
        success, data, status = self.make_request('GET', 'reports/pnl')
        expected_keys = ['total_revenue', 'total_cogs', 'net_profit', 'margin_percentage']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("P&L Report", success and has_keys)

        # Cashflow Report
        success, data, status = self.make_request('GET', 'reports/cashflow')
        expected_keys = ['total_inflow', 'total_outflow', 'net_cashflow']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Cashflow Report", success and has_keys)

        # Balance Sheet
        success, data, status = self.make_request('GET', 'reports/balance-sheet')
        expected_keys = ['assets', 'liabilities', 'equity']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Balance Sheet", success and has_keys)

        # Inventory Valuation
        success, data, status = self.make_request('GET', 'reports/inventory-valuation')
        expected_keys = ['items', 'total_value']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Inventory Valuation", success and has_keys)

    def test_create_cash_movement(self):
        """Test creating a cash movement"""
        if not self.account_ids:
            self.log_result("Create Cash Movement", False, "No account IDs available")
            return

        # Get outlets first
        success, data, status = self.make_request('GET', 'finance/accounts')
        if not success:
            self.log_result("Create Cash Movement", False, "Could not get accounts")
            return

        # Find an outlet ID from accounts
        outlet_id = None
        to_account_id = None
        for acc in data.get('accounts', []):
            if acc.get('outlet_id'):
                outlet_id = acc['outlet_id']
                # Use correct ID field
                id_field = '_id' if '_id' in acc else 'id'
                to_account_id = acc[id_field]
                break

        if not outlet_id or not to_account_id:
            self.log_result("Create Cash Movement", False, "No outlet or account found")
            return

        movement_data = {
            "type": "cash_in",
            "to_account_id": to_account_id,
            "amount": 100000,
            "outlet_id": outlet_id,
            "reference": "TEST-MOVEMENT",
            "description": "Test cash movement from API test"
        }

        success, data, status = self.make_request('POST', 'finance/cash-movements', movement_data, expected_status=200)
        self.log_result("Create Cash Movement", success and 'id' in data)

    def test_create_inventory_item(self):
        """Test creating an inventory item"""
        item_data = {
            "name": f"Test Item {datetime.now().strftime('%H%M%S')}",
            "category": "Test Category",
            "uom": "kg",
            "pack_size": 1,
            "material_level": "raw",
            "reorder_threshold": 10,
            "cost_per_unit": 5000,
            "description": "Test item created by API test"
        }

        success, data, status = self.make_request('POST', 'inventory/items', item_data, expected_status=200)
        self.log_result("Create Inventory Item", success and 'id' in data)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting F&B ERP Backend API Tests")
        print("=" * 50)

        # Test credentials from the review request
        test_credentials = [
            ("admin@fnb.com", "admin123"),
            ("finance@fnb.com", "finance123"),
            ("manager.sudirman@fnb.com", "manager123"),
            ("inventory@fnb.com", "inventory123")
        ]

        # Test health first
        self.test_health_check()

        # Test login with different users
        login_success = False
        for email, password in test_credentials:
            if self.test_login(email, password):
                login_success = True
                break

        if not login_success:
            print("❌ No successful login, stopping tests")
            return

        # Test authenticated endpoints
        self.test_get_me()
        self.test_get_portals()
        self.test_dashboard_summary()
        
        # Finance tests
        self.test_finance_accounts()
        self.test_cash_movements()
        
        # Inventory tests
        self.test_inventory_items()
        self.test_stock_on_hand()
        self.test_stock_movements()
        self.test_inventory_dashboard()
        
        # Reports tests
        self.test_reports()
        
        # Create operations tests
        self.test_create_cash_movement()
        self.test_create_inventory_item()

        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failed in self.failed_tests:
                print(f"  - {failed['test']}: {failed['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = FnBERPTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())