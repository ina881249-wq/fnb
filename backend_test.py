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
    def __init__(self, base_url="https://outlet-hub-system.preview.emergentagent.com"):
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

    def test_cashier_menu(self):
        """Test cashier menu endpoints"""
        # Get outlets first to use in menu tests
        success, data, status = self.make_request('GET', 'finance/accounts')
        outlet_id = None
        if success and data.get('accounts'):
            for acc in data['accounts']:
                if acc.get('outlet_id'):
                    outlet_id = acc['outlet_id']
                    break
        
        if not outlet_id:
            # Try to get outlets from a different endpoint
            success, data, status = self.make_request('GET', 'core/outlets')
            if success and data.get('outlets'):
                outlet_id = data['outlets'][0].get('_id') or data['outlets'][0].get('id')
        
        # Test menu list
        params = {'outlet_id': outlet_id} if outlet_id else {}
        success, data, status = self.make_request('GET', 'cashier/menu', params=params)
        expected_keys = ['items', 'categories', 'total']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Get Cashier Menu", success and has_keys)
        
        # Store menu items for later tests
        if success and data.get('items'):
            self.menu_items = data['items'][:3]  # Store first 3 items
        else:
            self.menu_items = []

    def test_cashier_shifts(self):
        """Test cashier shift management"""
        # Get outlets first
        success, data, status = self.make_request('GET', 'finance/accounts')
        outlet_id = None
        if success and data.get('accounts'):
            for acc in data['accounts']:
                if acc.get('outlet_id'):
                    outlet_id = acc['outlet_id']
                    break
        
        if not outlet_id:
            # Try to get outlets from a different endpoint
            success, data, status = self.make_request('GET', 'core/outlets')
            if success and data.get('outlets'):
                outlet_id = data['outlets'][0].get('_id') or data['outlets'][0].get('id')
        
        if not outlet_id:
            self.log_result("Cashier Shift Tests", False, "No outlet ID found")
            return
        
        # Test get current shift (should be none initially)
        success, data, status = self.make_request('GET', 'cashier/shifts/current', params={'outlet_id': outlet_id})
        self.log_result("Get Current Shift", success and 'shift' in data)
        
        # Test open shift
        shift_data = {
            "outlet_id": outlet_id,
            "opening_cash": 100000,
            "notes": "Test shift opening"
        }
        success, data, status = self.make_request('POST', 'cashier/shifts/open', shift_data)
        if success and 'id' in data:
            self.shift_id = data['id']
            self.log_result("Open Cashier Shift", True)
        else:
            # Might already have an open shift, try to get current
            success, data, status = self.make_request('GET', 'cashier/shifts/current', params={'outlet_id': outlet_id})
            if success and data.get('shift'):
                self.shift_id = data['shift']['id']
                self.log_result("Open Cashier Shift", True, "Using existing open shift")
            else:
                self.log_result("Open Cashier Shift", False, f"Status: {status}")
                self.shift_id = None
        
        # Test list shifts
        success, data, status = self.make_request('GET', 'cashier/shifts', params={'outlet_id': outlet_id})
        self.log_result("List Cashier Shifts", success and 'shifts' in data)

    def test_cashier_orders(self):
        """Test cashier order management"""
        if not hasattr(self, 'shift_id') or not self.shift_id:
            self.log_result("Cashier Order Tests", False, "No open shift available")
            return
        
        # Get outlet ID from shift or accounts
        success, data, status = self.make_request('GET', 'finance/accounts')
        outlet_id = None
        if success and data.get('accounts'):
            for acc in data['accounts']:
                if acc.get('outlet_id'):
                    outlet_id = acc['outlet_id']
                    break
        
        if not outlet_id:
            self.log_result("Cashier Order Tests", False, "No outlet ID found")
            return
        
        # Test create order
        if hasattr(self, 'menu_items') and self.menu_items:
            menu_item = self.menu_items[0]
            order_data = {
                "outlet_id": outlet_id,
                "order_type": "dine_in",
                "customer_name": "Test Customer",
                "table_number": "T1",
                "lines": [{
                    "menu_item_id": menu_item.get('_id') or menu_item.get('id'),
                    "name": menu_item.get('name', 'Test Item'),
                    "qty": 2,
                    "price": menu_item.get('price', 25000),
                    "notes": ""
                }],
                "notes": "Test order",
                "discount": 0,
                "tax_rate": 0
            }
            
            success, data, status = self.make_request('POST', 'cashier/orders', order_data)
            if success and data.get('order'):
                self.order_id = data['order']['id']
                self.log_result("Create POS Order", True)
                
                # Test pay order
                pay_data = {
                    "payment_method": "cash",
                    "amount_tendered": data['order']['total'] + 10000,  # Extra for change
                    "notes": "Test payment"
                }
                success, pay_response, status = self.make_request('POST', f'cashier/orders/{self.order_id}/pay', pay_data)
                self.log_result("Pay POS Order", success and 'change' in pay_response)
            else:
                self.log_result("Create POS Order", False, f"Status: {status}")
                self.order_id = None
        else:
            self.log_result("Create POS Order", False, "No menu items available")
        
        # Test list orders
        success, data, status = self.make_request('GET', 'cashier/orders', params={'outlet_id': outlet_id})
        self.log_result("List POS Orders", success and 'orders' in data)

    def test_cashier_dashboard(self):
        """Test cashier dashboard"""
        # Get outlet ID
        success, data, status = self.make_request('GET', 'finance/accounts')
        outlet_id = None
        if success and data.get('accounts'):
            for acc in data['accounts']:
                if acc.get('outlet_id'):
                    outlet_id = acc['outlet_id']
                    break
        
        if not outlet_id:
            self.log_result("Cashier Dashboard", False, "No outlet ID found")
            return
        
        success, data, status = self.make_request('GET', 'cashier/dashboard', params={'outlet_id': outlet_id})
        expected_keys = ['today_orders', 'today_sales', 'open_orders', 'current_shift', 'top_items']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Cashier Dashboard", success and has_keys)

    def test_cashier_void_order(self):
        """Test voiding an order"""
        if not hasattr(self, 'order_id') or not self.order_id:
            # Create a test order first
            self.test_cashier_orders()
        
        if hasattr(self, 'order_id') and self.order_id:
            # Create another order to void
            success, data, status = self.make_request('GET', 'finance/accounts')
            outlet_id = None
            if success and data.get('accounts'):
                for acc in data['accounts']:
                    if acc.get('outlet_id'):
                        outlet_id = acc['outlet_id']
                        break
            
            if outlet_id and hasattr(self, 'menu_items') and self.menu_items:
                menu_item = self.menu_items[0]
                order_data = {
                    "outlet_id": outlet_id,
                    "order_type": "takeaway",
                    "customer_name": "Test Void Customer",
                    "lines": [{
                        "menu_item_id": menu_item.get('_id') or menu_item.get('id'),
                        "name": menu_item.get('name', 'Test Item'),
                        "qty": 1,
                        "price": menu_item.get('price', 25000),
                        "notes": ""
                    }],
                    "notes": "Order to be voided",
                    "discount": 0,
                    "tax_rate": 0
                }
                
                success, data, status = self.make_request('POST', 'cashier/orders', order_data)
                if success and data.get('order'):
                    void_order_id = data['order']['id']
                    
                    # Now void it
                    void_data = {"reason": "Customer changed mind"}
                    success, void_response, status = self.make_request('POST', f'cashier/orders/{void_order_id}/void', void_data)
                    self.log_result("Void POS Order", success)
                else:
                    self.log_result("Void POS Order", False, "Could not create order to void")
            else:
                self.log_result("Void POS Order", False, "Missing outlet or menu items")
        else:
            self.log_result("Void POS Order", False, "No order available to test void")

    def test_cashier_close_shift(self):
        """Test closing a shift"""
        if not hasattr(self, 'shift_id') or not self.shift_id:
            self.log_result("Close Cashier Shift", False, "No open shift to close")
            return
        
        close_data = {
            "actual_cash": 150000,  # Some amount
            "notes": "Test shift closing"
        }
        
        success, data, status = self.make_request('POST', f'cashier/shifts/{self.shift_id}/close', close_data)
        expected_keys = ['totals', 'expected_cash', 'actual_cash', 'variance']
        has_keys = all(key in data for key in expected_keys) if success else False
        self.log_result("Close Cashier Shift", success and has_keys)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting F&B ERP Backend API Tests")
        print("=" * 50)

        # Test credentials from the review request
        test_credentials = [
            ("admin@fnb.com", "admin123"),
            ("cashier.sudirman@fnb.com", "cashier123"),
            ("cashier.kemang@fnb.com", "cashier123"),
            ("finance@fnb.com", "finance123"),
            ("manager.sudirman@fnb.com", "manager123"),
            ("inventory@fnb.com", "inventory123")
        ]

        # Test health first
        self.test_health_check()

        # Test login with different users, prioritize cashier users for cashier tests
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
        
        # Cashier Portal tests (Phase 3A)
        print("\n🏪 Testing Cashier Portal APIs...")
        self.test_cashier_menu()
        self.test_cashier_shifts()
        self.test_cashier_orders()
        self.test_cashier_dashboard()
        self.test_cashier_void_order()
        self.test_cashier_close_shift()

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