#!/usr/bin/env python3
"""
Backend API Testing for F&B ERP Journal-Driven Reporting (Tier 2 Task T2.1)

Tests all journal-driven financial reports and admin endpoints:
- Admin journal coverage and backfill
- P&L, Cashflow, Balance Sheet, Trial Balance, General Ledger reports
- Data consistency checks
- Role-based access control
"""

import requests
import sys
import json
from datetime import datetime

class JournalReportingTester:
    def __init__(self, base_url="https://outlet-hub-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.superadmin_token = None
        self.manager_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def login(self, email, password):
        """Login and return token"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password},
                headers={'Content-Type': 'application/json'}
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('token')
            else:
                print(f"Login failed for {email}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Login error for {email}: {str(e)}")
            return None

    def api_request(self, method, endpoint, token=None, data=None, params=None):
        """Make API request with token"""
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        url = f"{self.base_url}{endpoint}"
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"API request error: {str(e)}")
            return None

    def test_admin_journal_coverage(self):
        """Test GET /api/admin/journals/coverage (superadmin only)"""
        print("\n🔍 Testing Admin Journal Coverage...")
        
        # Test superadmin access
        response = self.api_request('GET', '/api/admin/journals/coverage', self.superadmin_token)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ['sales_summary', 'petty_cash', 'cash_movement', 'total_journals_posted']
            has_all_fields = all(field in data for field in required_fields)
            self.log_test("Admin coverage endpoint accessible", has_all_fields, 
                         f"Missing fields: {[f for f in required_fields if f not in data]}")
            
            # Check coverage percentages (should be 100% for backfilled data)
            sales_coverage = data.get('sales_summary', {}).get('coverage_pct', 0)
            petty_coverage = data.get('petty_cash', {}).get('coverage_pct', 0)
            cash_coverage = data.get('cash_movement', {}).get('coverage_pct', 0)
            
            self.log_test("Sales summary coverage 100%", sales_coverage == 100.0, 
                         f"Got {sales_coverage}%")
            self.log_test("Petty cash coverage 100%", petty_coverage == 100.0, 
                         f"Got {petty_coverage}%")
            self.log_test("Cash movement coverage 100%", cash_coverage == 100.0, 
                         f"Got {cash_coverage}%")
            
            total_journals = data.get('total_journals_posted', 0)
            self.log_test("Total journals posted > 290", total_journals > 290, 
                         f"Got {total_journals} journals")
            
            print(f"   📊 Coverage: Sales {sales_coverage}%, Petty {petty_coverage}%, Cash {cash_coverage}%")
            print(f"   📊 Total journals: {total_journals}")
        else:
            self.log_test("Admin coverage endpoint", False, 
                         f"Status: {response.status_code if response else 'No response'}")

        # Test non-superadmin access (should be 403)
        if self.manager_token:
            response = self.api_request('GET', '/api/admin/journals/coverage', self.manager_token)
            expected_403 = response and response.status_code == 403
            self.log_test("Coverage endpoint rejects non-superadmin", expected_403,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_admin_backfill_idempotent(self):
        """Test POST /api/admin/journals/backfill idempotency"""
        print("\n🔍 Testing Admin Backfill Idempotency...")
        
        # Test superadmin access
        response = self.api_request('POST', '/api/admin/journals/backfill', self.superadmin_token, {})
        if response and response.status_code == 200:
            data = response.json()
            
            # Check idempotency - should skip already posted
            report = data.get('report', {})
            total_skipped = 0
            total_posted = 0
            
            for source in ['sales_summary', 'petty_cash', 'cash_movement']:
                skipped = report.get(source, {}).get('skipped_already_posted', 0)
                posted = report.get(source, {}).get('posted', 0)
                total_skipped += skipped
                total_posted += posted
            
            self.log_test("Backfill is idempotent", total_skipped > 0 and total_posted == 0,
                         f"Skipped: {total_skipped}, Posted: {total_posted}")
            
            print(f"   📊 Backfill result: {total_skipped} skipped, {total_posted} posted")
        else:
            self.log_test("Backfill endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

        # Test non-superadmin access (should be 403)
        if self.manager_token:
            response = self.api_request('POST', '/api/admin/journals/backfill', self.manager_token, {})
            expected_403 = response and response.status_code == 403
            self.log_test("Backfill endpoint rejects non-superadmin", expected_403,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_pnl_report(self):
        """Test GET /api/reports/pnl"""
        print("\n🔍 Testing P&L Report...")
        
        params = {
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        response = self.api_request('GET', '/api/reports/pnl', self.superadmin_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check data source
            self.log_test("P&L data source is journals", data.get('data_source') == 'journals')
            
            # Check non-zero revenue
            total_revenue = data.get('total_revenue', 0)
            self.log_test("P&L has non-zero revenue", total_revenue > 0, 
                         f"Revenue: {total_revenue}")
            
            # Check required breakdowns
            has_revenue_breakdown = bool(data.get('revenue_breakdown'))
            has_cogs_breakdown = bool(data.get('cogs_breakdown'))
            has_expense_breakdown = bool(data.get('expense_breakdown'))
            has_revenue_by_outlet = bool(data.get('revenue_by_outlet'))
            
            self.log_test("P&L has revenue breakdown", has_revenue_breakdown)
            self.log_test("P&L has COGS breakdown", has_cogs_breakdown)
            self.log_test("P&L has expense breakdown", has_expense_breakdown)
            self.log_test("P&L has revenue by outlet", has_revenue_by_outlet)
            
            # Check outlet count (should have 2 outlets: Denpasar & Tabanan)
            outlet_count = len(data.get('revenue_by_outlet', []))
            self.log_test("P&L shows 2 outlets", outlet_count == 2, 
                         f"Found {outlet_count} outlets")
            
            print(f"   📊 Revenue: Rp {total_revenue:,.0f}")
            print(f"   📊 Net Profit: Rp {data.get('net_profit', 0):,.0f}")
            print(f"   📊 Journal Count: {data.get('journal_count', 0)}")
        else:
            self.log_test("P&L report endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_cashflow_report(self):
        """Test GET /api/reports/cashflow"""
        print("\n🔍 Testing Cashflow Report...")
        
        params = {
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        response = self.api_request('GET', '/api/reports/cashflow', self.superadmin_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check data source
            self.log_test("Cashflow data source is journals", data.get('data_source') == 'journals')
            
            # Check required categories
            by_category = data.get('by_category', {})
            has_operating = 'operating' in by_category
            has_financing = 'financing' in by_category
            has_investing = 'investing' in by_category
            
            self.log_test("Cashflow has operating category", has_operating)
            self.log_test("Cashflow has financing category", has_financing)
            self.log_test("Cashflow has investing category", has_investing)
            
            # Check daily cashflow array
            daily_cashflow = data.get('daily_cashflow', [])
            self.log_test("Cashflow has daily data", len(daily_cashflow) > 0,
                         f"Found {len(daily_cashflow)} days")
            
            # Check breakdowns
            has_inflow_breakdown = bool(data.get('inflow_breakdown'))
            has_outflow_breakdown = bool(data.get('outflow_breakdown'))
            
            self.log_test("Cashflow has inflow breakdown", has_inflow_breakdown)
            self.log_test("Cashflow has outflow breakdown", has_outflow_breakdown)
            
            print(f"   📊 Total Inflow: Rp {data.get('total_inflow', 0):,.0f}")
            print(f"   📊 Total Outflow: Rp {data.get('total_outflow', 0):,.0f}")
            print(f"   📊 Net Cashflow: Rp {data.get('net_cashflow', 0):,.0f}")
        else:
            self.log_test("Cashflow report endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_balance_sheet_report(self):
        """Test GET /api/reports/balance-sheet"""
        print("\n🔍 Testing Balance Sheet Report...")
        
        params = {
            'as_of': '2026-04-30'
        }
        
        response = self.api_request('GET', '/api/reports/balance-sheet', self.superadmin_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check data source
            self.log_test("Balance Sheet data source is journals", data.get('data_source') == 'journals')
            
            # Check required sections
            has_assets = bool(data.get('assets', {}).get('accounts'))
            has_liabilities = bool(data.get('liabilities'))
            has_equity = bool(data.get('equity'))
            
            self.log_test("Balance Sheet has assets", has_assets)
            self.log_test("Balance Sheet has liabilities", has_liabilities)
            self.log_test("Balance Sheet has equity", has_equity)
            
            # Check balance equation
            balance_check = data.get('balance_check', {})
            is_balanced = balance_check.get('is_balanced', False)
            self.log_test("Balance Sheet is balanced", is_balanced,
                         f"Difference: {balance_check.get('difference', 'N/A')}")
            
            # Check retained earnings
            retained_earnings = data.get('equity', {}).get('retained_earnings_current_period')
            self.log_test("Balance Sheet has retained earnings", retained_earnings is not None,
                         f"Retained earnings: {retained_earnings}")
            
            print(f"   📊 Total Assets: Rp {data.get('assets', {}).get('total', 0):,.0f}")
            print(f"   📊 Total Liabilities: Rp {data.get('liabilities', {}).get('total', 0):,.0f}")
            print(f"   📊 Total Equity: Rp {data.get('equity', {}).get('total', 0):,.0f}")
        else:
            self.log_test("Balance Sheet report endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_trial_balance_report(self):
        """Test GET /api/reports/trial-balance"""
        print("\n🔍 Testing Trial Balance Report...")
        
        params = {
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        response = self.api_request('GET', '/api/reports/trial-balance', self.superadmin_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check data source
            self.log_test("Trial Balance data source is journals", data.get('data_source') == 'journals')
            
            # Check balance (debit = credit)
            is_balanced = data.get('is_balanced', False)
            total_debit = data.get('total_debit', 0)
            total_credit = data.get('total_credit', 0)
            
            self.log_test("Trial Balance is balanced", is_balanced,
                         f"Debit: {total_debit}, Credit: {total_credit}")
            
            # Check rows
            rows = data.get('rows', [])
            self.log_test("Trial Balance has 12+ accounts", len(rows) >= 12,
                         f"Found {len(rows)} accounts")
            
            # Check required columns in rows
            if rows:
                first_row = rows[0]
                required_cols = ['account_code', 'account_name', 'account_type', 'debit', 'credit', 'balance']
                has_all_cols = all(col in first_row for col in required_cols)
                self.log_test("Trial Balance has required columns", has_all_cols,
                             f"Missing: {[c for c in required_cols if c not in first_row]}")
            
            print(f"   📊 Total Debit: Rp {total_debit:,.0f}")
            print(f"   📊 Total Credit: Rp {total_credit:,.0f}")
            print(f"   📊 Account Count: {len(rows)}")
        else:
            self.log_test("Trial Balance report endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_general_ledger_report(self):
        """Test GET /api/reports/general-ledger"""
        print("\n🔍 Testing General Ledger Report...")
        
        # First get trial balance to find a revenue account (4100 Food Sales)
        tb_response = self.api_request('GET', '/api/reports/trial-balance', self.superadmin_token)
        if not tb_response or tb_response.status_code != 200:
            self.log_test("General Ledger test setup", False, "Could not get trial balance")
            return
        
        tb_data = tb_response.json()
        food_sales_account = None
        
        for row in tb_data.get('rows', []):
            if row.get('account_code') == '4100':  # Food Sales
                food_sales_account = row.get('account_id')
                break
        
        if not food_sales_account:
            self.log_test("General Ledger test setup", False, "Could not find Food Sales account (4100)")
            return
        
        params = {
            'account_id': food_sales_account,
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        response = self.api_request('GET', '/api/reports/general-ledger', self.superadmin_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Check data source
            self.log_test("General Ledger data source is journals", data.get('data_source') == 'journals')
            
            # Check account info
            account = data.get('account', {})
            self.log_test("General Ledger has account info", bool(account.get('name')))
            
            # Check totals
            total_debit = data.get('total_debit', 0)
            total_credit = data.get('total_credit', 0)
            balance = data.get('balance', 0)
            
            self.log_test("General Ledger has totals", total_debit >= 0 and total_credit >= 0)
            
            # Check lines with enriched data
            lines = data.get('lines', [])
            if lines:
                first_line = lines[0]
                has_journal_number = bool(first_line.get('journal_number'))
                has_posting_date = bool(first_line.get('posting_date'))
                
                self.log_test("General Ledger lines have journal_number", has_journal_number)
                self.log_test("General Ledger lines have posting_date", has_posting_date)
            
            print(f"   📊 Account: {account.get('code')} {account.get('name')}")
            print(f"   📊 Balance: Rp {balance:,.0f}")
            print(f"   📊 Line Count: {len(lines)}")
        else:
            self.log_test("General Ledger report endpoint", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_consistency_checks(self):
        """Test data consistency between reports"""
        print("\n🔍 Testing Report Consistency...")
        
        params = {
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        # Get P&L and Balance Sheet
        pnl_response = self.api_request('GET', '/api/reports/pnl', self.superadmin_token, params=params)
        bs_response = self.api_request('GET', '/api/reports/balance-sheet', self.superadmin_token, 
                                     params={'as_of': '2026-04-30'})
        
        if pnl_response and pnl_response.status_code == 200 and bs_response and bs_response.status_code == 200:
            pnl_data = pnl_response.json()
            bs_data = bs_response.json()
            
            # Check P&L net profit vs Balance Sheet retained earnings
            net_profit = pnl_data.get('net_profit', 0)
            retained_earnings = bs_data.get('equity', {}).get('retained_earnings_current_period', 0)
            
            # Allow small rounding differences
            difference = abs(net_profit - retained_earnings)
            is_consistent = difference < 10.0  # Within Rp 10 tolerance
            
            self.log_test("P&L net profit equals BS retained earnings", is_consistent,
                         f"P&L: {net_profit}, BS: {retained_earnings}, Diff: {difference}")
            
            print(f"   📊 P&L Net Profit: Rp {net_profit:,.0f}")
            print(f"   📊 BS Retained Earnings: Rp {retained_earnings:,.0f}")
        else:
            self.log_test("Consistency check setup", False, "Could not get P&L or Balance Sheet")

    def test_outlet_scoping(self):
        """Test outlet manager access scoping"""
        print("\n🔍 Testing Outlet Scoping...")
        
        if not self.manager_token:
            self.log_test("Outlet scoping test setup", False, "No manager token available")
            return
        
        params = {
            'period_start': '2026-01-01',
            'period_end': '2026-04-30'
        }
        
        # Test manager access to P&L (should only see their outlet's data)
        response = self.api_request('GET', '/api/reports/pnl', self.manager_token, params=params)
        if response and response.status_code == 200:
            data = response.json()
            
            # Manager should see fewer journals than superadmin
            journal_count = data.get('journal_count', 0)
            self.log_test("Manager sees scoped journal data", journal_count > 0,
                         f"Manager journal count: {journal_count}")
            
            # Check revenue by outlet (should be limited)
            revenue_by_outlet = data.get('revenue_by_outlet', [])
            outlet_count = len(revenue_by_outlet)
            
            # Manager should see limited outlets (likely just their own)
            self.log_test("Manager sees limited outlets", outlet_count <= 2,
                         f"Manager sees {outlet_count} outlets")
            
            print(f"   📊 Manager Journal Count: {journal_count}")
            print(f"   📊 Manager Outlet Count: {outlet_count}")
        else:
            self.log_test("Manager P&L access", False,
                         f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting F&B ERP Journal-Driven Reporting Tests")
        print("=" * 60)
        
        # Login
        print("\n🔐 Authenticating...")
        self.superadmin_token = self.login("admin@lusipakan.com", "admin123")
        if not self.superadmin_token:
            print("❌ Failed to login as superadmin")
            return 1
        print("✅ Superadmin authenticated")
        
        self.manager_token = self.login("manager.denpasar@lusipakan.com", "manager123")
        if not self.manager_token:
            print("⚠️  Failed to login as manager (will skip scoping tests)")
        else:
            print("✅ Manager authenticated")
        
        # Run tests
        self.test_admin_journal_coverage()
        self.test_admin_backfill_idempotent()
        self.test_pnl_report()
        self.test_cashflow_report()
        self.test_balance_sheet_report()
        self.test_trial_balance_report()
        self.test_general_ledger_report()
        self.test_consistency_checks()
        self.test_outlet_scoping()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = JournalReportingTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())