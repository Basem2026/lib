import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
// import { TreasuryProvider } from "./contexts/TreasuryContext"; // تم حذف TreasuryContext القديم
import { CustomersProvider } from "./contexts/CustomersContext";
import { OperationsProvider } from "./contexts/OperationsContext";
import { FinancialProvider } from "./contexts/FinancialContext";
import { AuditProvider } from "./contexts/AuditContext";
import { AuditLogsProvider } from "./contexts/AuditLogsContext";
import { CardsProvider } from "./contexts/CardsContext";
import { EmployeesProvider } from "./contexts/EmployeesContext";
import { LogsProvider } from "./contexts/LogsContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { BankAccountsProvider } from "./contexts/BankAccountsContext";
import { CompanyBankAccountsProvider } from "./contexts/CompanyBankAccountsContext";
import { ServicesProvider } from "./contexts/ServicesContext";
import { ApprovalsProvider } from "./contexts/ApprovalsContext";
import { DollarRatesProvider } from "./contexts/DollarRatesContext";
import { BankCardsProvider } from "./contexts/BankCardsContext";


// import { BankingTreasuryProvider } from "./contexts/BankingTreasuryContext"; // تم حذف BankingTreasuryContext القديم
import { DepartmentsProvider } from "./contexts/DepartmentsContext";
import { DailyOperationsProvider } from "./contexts/DailyOperationsContext";
import { ExpensesProvider } from "./contexts/ExpensesContext";
import { SalariesProvider } from "./contexts/SalariesContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { NotificationBadge } from "./components/NotificationBadge";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Staff from "./pages/Staff";

import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import CardsManagement from "./pages/CardsManagement";
import BulkStatusChange from "./pages/BulkStatusChange";
import BulkWithdrawal from "./pages/BulkWithdrawal";
import WithdrawHeld from "./pages/WithdrawHeld";


import Reports from "./pages/Reports";
import AllLogsPage from "./pages/AllLogsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsV2 from "./pages/SettingsV2";
import PersonalDashboard from "./pages/PersonalDashboard";
import Dashboard from "./pages/Dashboard";
import OfficeStaff from "./pages/OfficeStaff";
import DataEntryDashboard from "./pages/DataEntryDashboard";
import EmployeesPage from "./pages/EmployeesPage";
import CustodyManagement from "./pages/CustodyManagement";
import Delegates from "@/pages/Delegates";
import DelegateCommissions from "@/pages/DelegateCommissions";



// Old logs pages removed - now using AllLogsPage
import PermissionsManagement from "./pages/PermissionsManagement";
import ServicesManagement from "./pages/ServicesManagement";
import Approvals from "./pages/Approvals";
import EmergencyFix from "./pages/EmergencyFix";

import TreasuryPage from "./pages/TreasuryPage";
import FinancialReportsPage from "./pages/FinancialReportsPage";
import DailyOperationsPageV2 from "./pages/DailyOperationsPageV2";
import ExpensesPageV2 from "./pages/ExpensesPageV2";
import SalariesPageV2 from "./pages/SalariesPageV2";
import DailyCustodyPage from "./pages/DailyCustodyPage";
import Profile from "./pages/Profile";
import Blocked from "./pages/Blocked";
import ProtectedRoute from "./components/ProtectedRoute";
import AppsPage from "./pages/Apps";
import AlertsPage from "./pages/AlertsPage";
import GroupCardsReport from "./pages/GroupCardsReport";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import TransfersPage from "./pages/TransfersPage";
import { PermissionsSetup, usePermissionsSetup } from "./components/PermissionsSetup";


function PermissionsGate() {
  const { showSetup, completeSetup } = usePermissionsSetup();
  if (!showSetup) return null;
  return <PermissionsSetup onComplete={completeSetup} />;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/apps"} component={AppsPage} />
      <Route path={"/login"} component={Login} />
      <Route path={"/staff"} component={Staff} />
      <Route path={"/blocked"} component={Blocked} />
      <Route path={"/emergency-fix"} component={EmergencyFix} />
      <Route path={"/profile"}>
        {() => (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/dashboard"}>
        {() => (
          <ProtectedRoute>
            <PersonalDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/statistics"}>
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/data-entry"}>
        {() => (
          <ProtectedRoute requiredPermission="add_customer">
            <DataEntryDashboard />
          </ProtectedRoute>
        )}
      </Route>

      <Route path={"/alerts"}>
        {() => (
          <ProtectedRoute requiredPermission="view_alerts">
            <AlertsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path={"/customers"}>
        {() => (
          <ProtectedRoute requiredPermission="view_customers">
            <Customers />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/customers/:id"}>
        {() => (
          <ProtectedRoute requiredPermission="view_customers">
            <CustomerDetails />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={'/group-cards-report'}>
        {() => (
          <ProtectedRoute requiredPermission="view_cards">
            <GroupCardsReport />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={'/cards'}>
        {() => (
          <ProtectedRoute requiredPermission="view_cards">
            <CardsManagement />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/bulk-status-change"}>
        {() => (
          <ProtectedRoute requiredPermissions={["view_operations", "edit_operation"]} requireAll>
            <BulkStatusChange />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/bulk-withdrawal"}>
        {() => (
          <ProtectedRoute requiredPermissions={["view_operations", "add_operation"]} requireAll>
            <BulkWithdrawal />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/withdraw-held"}>
        {() => (
          <ProtectedRoute requiredPermissions={["view_operations", "add_operation"]} requireAll>
            <WithdrawHeld />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/daily-operations"}>
        {() => (
          <ProtectedRoute requiredPermission="view_operations">
            <DailyOperationsPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/expenses"}>
        {() => (
          <ProtectedRoute requiredPermission="view_expenses">
            <ExpensesPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/salaries"}>
        {() => (
          <ProtectedRoute requiredPermission="view_salaries">
            <SalariesPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/reports"}>
        {() => (
          <ProtectedRoute requiredPermission="view_reports">
            <Reports />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/logs"}>
        {() => (
          <ProtectedRoute requiredPermission="view_logs">
            <AllLogsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/notifications"}>
        {() => (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/settings"} component={SettingsV2} />

      <Route path={"/office-staff"}>
        {() => (
          <ProtectedRoute requiredPermission="view_operations">
            <OfficeStaff />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/employees">
        {() => (
          <ProtectedRoute requiredPermission="view_employee_logs">
            <EmployeesPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/delegates">
        {() => (
          <ProtectedRoute>
            <Delegates />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/delegate-commissions">
        {() => (
          <ProtectedRoute>
            <DelegateCommissions />
          </ProtectedRoute>
        )}
      </Route>
      <Route path={"/custody"}>
        {() => (
          <ProtectedRoute requiredPermission="view_treasury">
            <CustodyManagement />
          </ProtectedRoute>
        )}
      </Route>



      <Route path="/treasury" component={TreasuryPage} />
      <Route path="/transfers" component={TransfersPage} />      <Route path="/financial-reports">
        {() => (
          <ProtectedRoute>
            <FinancialReportsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/daily-operations-v2">
        {() => (
          <ProtectedRoute>
            <DailyOperationsPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/expenses-v2">
        {() => (
          <ProtectedRoute>
            <ExpensesPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/salaries-v2">
        {() => (
          <ProtectedRoute>
            <SalariesPageV2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/daily-custody">
        {() => (
          <ProtectedRoute>
            <DailyCustodyPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/employee-logs">
        {() => (
          <ProtectedRoute requiredPermission="view_logs">
            <AllLogsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/management-logs">
        {() => (
          <ProtectedRoute requiredPermission="view_logs">
            <AllLogsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/audit-logs">
        {() => (
          <ProtectedRoute requiredPermission="view_logs">
            <AllLogsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/permissions">
        {() => (
          <ProtectedRoute requiredPermission="manage_permissions">
            <PermissionsManagement />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/services-management">
        {() => (
          <ProtectedRoute requiredPermission="manage_permissions">
            <ServicesManagement />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/approvals">
        {() => (
          <ProtectedRoute requiredPermission="manage_permissions">
            <Approvals />
          </ProtectedRoute>
        )}
      </Route>


      <Route path="/company-settings">
        {() => (
          <ProtectedRoute>
            <CompanySettingsPage />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AuthProvider>
		<CompanyProvider>
         <DollarRatesProvider>
          <BankCardsProvider>
            <AccountsProvider>
              <DepartmentsProvider>
                <DailyOperationsProvider>
                  <ExpensesProvider>
                    <SalariesProvider>
                      <EmployeesProvider>
                        <ServicesProvider>
                            <AuditLogsProvider>
                              <ApprovalsProvider>
                                <LogsProvider>
                                  <NotificationsProvider>
                                    <BankAccountsProvider>
                                      <CompanyBankAccountsProvider>
                                        <CustomersProvider>
                                          <CardsProvider>
                                            <FinancialProvider>
                                              <AuditProvider>
                                                <OperationsProvider>
                                                  <TooltipProvider>
                                    <Toaster />
                                    <NotificationBadge />
                                    <PermissionsGate />
                                    <Router />
                                                  </TooltipProvider>
                                                </OperationsProvider>
                                              </AuditProvider>
                                            </FinancialProvider>
                                          </CardsProvider>
                                        </CustomersProvider>
                                      </CompanyBankAccountsProvider>
                                    </BankAccountsProvider>
                                  </NotificationsProvider>
                                </LogsProvider>
                              </ApprovalsProvider>
                            </AuditLogsProvider>
                        </ServicesProvider>
                      </EmployeesProvider>
                    </SalariesProvider>
                  </ExpensesProvider>
                </DailyOperationsProvider>
              </DepartmentsProvider>
            </AccountsProvider>
          </BankCardsProvider>
        </DollarRatesProvider>
        </CompanyProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
