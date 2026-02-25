import requests
import sys
from datetime import datetime, timedelta
import json

class HebronAPITester:
    def __init__(self, base_url="https://hebron-schedule.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.text else {}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw Response: {response.text}")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "/health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "/", 200)

    def test_admin_login_valid(self):
        """Test admin login with valid credentials"""
        success, response = self.run_test(
            "Admin Login (Valid)",
            "POST",
            "/admin/login",
            200,
            data={"username": "admin", "password": "hebronadmin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:50]}...")
            return True
        return False

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        return self.run_test(
            "Admin Login (Invalid)",
            "POST",
            "/admin/login",
            401,
            data={"username": "admin", "password": "wrongpassword"}
        )

    def test_availability_endpoint(self):
        """Test getting availability"""
        today = datetime.now()
        end_date = today + timedelta(days=30)
        
        return self.run_test(
            "Get Availability",
            "GET",
            f"/bookings/availability?start_date={today.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}",
            200
        )

    def test_create_booking_valid(self):
        """Test creating a valid booking"""
        # Find next Monday
        today = datetime.now()
        days_ahead = 0 - today.weekday()  # Monday is 0
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        next_monday = today + timedelta(days=days_ahead)
        
        booking_data = {
            "full_name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "role": "Prayer",
            "date": next_monday.strftime('%Y-%m-%d'),
            "notes": "Test booking from automated test",
            "email": "test@example.com"
        }
        
        success, response = self.run_test(
            "Create Booking (Valid)",
            "POST",
            "/bookings",
            200,
            data=booking_data
        )
        
        if success and response.get('id'):
            self.test_booking_id = response['id']
            print(f"   Booking created with ID: {self.test_booking_id}")
            return True
        return False

    def test_create_booking_duplicate(self):
        """Test creating a duplicate booking (should fail)"""
        # Try to create another booking for same date/role
        today = datetime.now()
        days_ahead = 0 - today.weekday()  # Monday is 0
        if days_ahead <= 0:
            days_ahead += 7
        next_monday = today + timedelta(days=days_ahead)
        
        booking_data = {
            "full_name": "Another Test User",
            "role": "Prayer",  # Same role as previous test
            "date": next_monday.strftime('%Y-%m-%d'),  # Same date as previous test
            "notes": "This should fail - slot conflict"
        }
        
        return self.run_test(
            "Create Booking (Duplicate - Should Fail)",
            "POST",
            "/bookings",
            409,  # Expect conflict
            data=booking_data
        )

    def test_create_booking_invalid_date(self):
        """Test creating booking with invalid date"""
        booking_data = {
            "full_name": "Test User",
            "role": "Worship",
            "date": "2024-01-01",  # Past date
            "notes": "This should fail - past date"
        }
        
        return self.run_test(
            "Create Booking (Invalid Date)",
            "POST",
            "/bookings",
            400,
            data=booking_data
        )

    def test_create_booking_invalid_role(self):
        """Test creating booking with invalid role"""
        today = datetime.now()
        days_ahead = 1 - today.weekday()  # Tuesday is 1
        if days_ahead <= 0:
            days_ahead += 7
        next_tuesday = today + timedelta(days=days_ahead)
        
        booking_data = {
            "full_name": "Test User",
            "role": "InvalidRole",
            "date": next_tuesday.strftime('%Y-%m-%d'),
            "notes": "This should fail - invalid role"
        }
        
        return self.run_test(
            "Create Booking (Invalid Role)",
            "POST",
            "/bookings",
            422,  # Validation error
            data=booking_data
        )

    def test_get_admin_bookings_unauthorized(self):
        """Test getting admin bookings without auth"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Get Admin Bookings (Unauthorized)",
            "GET",
            "/admin/bookings",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def test_get_admin_bookings_authorized(self):
        """Test getting admin bookings with auth"""
        if not self.token:
            print("❌ No auth token available - skipping authorized test")
            return False
            
        return self.run_test(
            "Get Admin Bookings (Authorized)",
            "GET",
            "/admin/bookings",
            200
        )

    def test_get_admin_bookings_with_filters(self):
        """Test getting admin bookings with filters"""
        if not self.token:
            print("❌ No auth token available - skipping filtered test")
            return False
            
        return self.run_test(
            "Get Admin Bookings (With Filters)",
            "GET",
            "/admin/bookings?role_filter=Prayer&status_filter=Booked",
            200
        )

    def test_update_booking(self):
        """Test updating a booking"""
        if not self.token:
            print("❌ No auth token available - skipping update test")
            return False
            
        if not hasattr(self, 'test_booking_id'):
            print("❌ No test booking ID available - skipping update test")
            return False
            
        update_data = {
            "notes": "Updated notes from automated test"
        }
        
        return self.run_test(
            "Update Booking",
            "PUT",
            f"/admin/bookings/{self.test_booking_id}",
            200,
            data=update_data
        )

    def test_unlock_slot(self):
        """Test unlocking a slot"""
        if not self.token:
            print("❌ No auth token available - skipping unlock test")
            return False
            
        if not hasattr(self, 'test_booking_id'):
            print("❌ No test booking ID available - skipping unlock test")
            return False
            
        return self.run_test(
            "Unlock Slot",
            "POST",
            f"/admin/bookings/{self.test_booking_id}/unlock",
            200
        )

    def test_get_analytics(self):
        """Test getting analytics"""
        if not self.token:
            print("❌ No auth token available - skipping analytics test")
            return False
            
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        return self.run_test(
            "Get Analytics",
            "GET",
            f"/admin/analytics?month={current_month}&year={current_year}",
            200
        )

    def test_get_monthly_report(self):
        """Test getting monthly report"""
        if not self.token:
            print("❌ No auth token available - skipping monthly report test")
            return False
            
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        return self.run_test(
            "Get Monthly Report",
            "GET",
            f"/admin/reports/monthly?month={current_month}&year={current_year}",
            200
        )

    def test_export_csv(self):
        """Test CSV export endpoint"""
        if not self.token:
            print("❌ No auth token available - skipping CSV export test")
            return False
            
        # Note: This should return a file download, so we expect different handling
        url = f"{self.api_url}/admin/export/csv"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        print(f"\n🔍 Testing CSV Export...")
        print(f"   URL: {url}")
        
        self.tests_run += 1
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200 and 'text/csv' in response.headers.get('content-type', ''):
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                print(f"   CSV Content Length: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ Failed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'Unknown')}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_export_excel(self):
        """Test Excel export endpoint"""
        if not self.token:
            print("❌ No auth token available - skipping Excel export test")
            return False
            
        url = f"{self.api_url}/admin/export/excel"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        print(f"\n🔍 Testing Excel Export...")
        print(f"   URL: {url}")
        
        self.tests_run += 1
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200 and 'spreadsheetml' in response.headers.get('content-type', ''):
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                print(f"   Excel Content Length: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ Failed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'Unknown')}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_delete_booking(self):
        """Test deleting a booking (cleanup)"""
        if not self.token:
            print("❌ No auth token available - skipping delete test")
            return False
            
        if not hasattr(self, 'test_booking_id'):
            print("❌ No test booking ID available - skipping delete test")
            return False
            
        return self.run_test(
            "Delete Booking (Cleanup)",
            "DELETE",
            f"/admin/bookings/{self.test_booking_id}",
            200
        )

def main():
    print("🚀 Starting Hebron Pentecostal Assembly API Tests")
    print("=" * 60)
    
    # Initialize tester
    tester = HebronAPITester()
    
    # Run tests in order
    test_results = []
    
    # Basic endpoint tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_root_endpoint())
    
    # Authentication tests
    test_results.append(tester.test_admin_login_invalid())
    test_results.append(tester.test_admin_login_valid())
    
    # Public endpoints
    test_results.append(tester.test_availability_endpoint())
    
    # Booking creation tests
    test_results.append(tester.test_create_booking_valid())
    test_results.append(tester.test_create_booking_duplicate())
    test_results.append(tester.test_create_booking_invalid_date())
    test_results.append(tester.test_create_booking_invalid_role())
    
    # Admin endpoints (require auth)
    test_results.append(tester.test_get_admin_bookings_unauthorized())
    test_results.append(tester.test_get_admin_bookings_authorized())
    test_results.append(tester.test_get_admin_bookings_with_filters())
    
    # Booking management
    test_results.append(tester.test_update_booking())
    test_results.append(tester.test_unlock_slot())
    
    # Analytics and reports
    test_results.append(tester.test_get_analytics())
    test_results.append(tester.test_get_monthly_report())
    
    # Export functionality
    test_results.append(tester.test_export_csv())
    test_results.append(tester.test_export_excel())
    
    # Cleanup
    test_results.append(tester.test_delete_booking())
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} test(s) failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())