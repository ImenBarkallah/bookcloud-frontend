import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { GuestAuthGuard } from './core/guards/guest-auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Enums
import { Role } from './enums/role.enum';

// Public pages
import { HomeComponent } from './features/dashboard/home/home.component';
import { AboutPageComponent } from './features/dashboard/about/about-page.component';
import { CataloguePageComponent } from './features/books/catalogue/catalogue-page.component';
import { CategoriesPageComponent } from './features/books/categories/categories-page.component';
import { AuthorsPageComponent } from './features/books/authors/authors-page.component';
import { BookDetailPageComponent } from './features/books/book-detail/book-detail-page.component';
import { OffersPageComponent } from './features/offers/offers-page/offers-page.component';
import { OfferDetailPageComponent } from './features/offers/offer-detail/offer-detail-page.component';

// Auth
import { AuthShellComponent } from './features/auth/auth-shell/auth-shell.component';
import { LoginPageComponent } from './features/auth/login/login-page.component';
import { RegisterPageComponent } from './features/auth/register/register-page.component';

// User
import { ProfilePageComponent } from './features/users/components/profile/profile-page.component';
import { FavoritesPageComponent } from './features/users/favorites/favorites-page/favorites-page.component';
import { MyLoansPageComponent } from './features/users/loans/my-loans-page/my-loans-page.component';

// Admin
import { AdminDashboardPageComponent } from './features/dashboard/admin/admin-dashboard-page.component';
import { AdminCategoriesPageComponent } from './features/dashboard/admin/categories/admin-categories-page.component';
import { AdminPartnersPageComponent } from './features/dashboard/admin/partners/admin-partners-page.component';
import { AdminLoansPageComponent } from './features/dashboard/admin/loans/admin-loans-page.component';
import { AdminReservationsPageComponent } from './features/dashboard/admin/reservations/admin-reservations-page.component';
import { AdminBooksPageComponent } from './features/dashboard/admin/books/admin-books-page.component';
import { AdminAuthorsPageComponent } from './features/dashboard/admin/authors/admin-authors-page.component';
import { AdminUsersPageComponent } from './features/dashboard/admin/users/admin-users-page.component';
import { AdminRolesPageComponent } from './features/dashboard/admin/roles/admin-roles-page.component';
import { AdminLibrarySettingsPageComponent } from './features/dashboard/admin/settings/admin-library-settings-page.component';
import { AdminModerationPageComponent } from './features/dashboard/admin/moderation/admin-moderation-page.component';
import { AdminOffersPageComponent } from './features/dashboard/admin/offers/admin-offers-page.component';
import { AdminNewsPageComponent } from './features/dashboard/admin/news/admin-news-page.component';
import { AdminBranchesPageComponent } from './features/dashboard/admin/branches/admin-branches-page.component';
import { ErrorPageComponent } from './features/errors/error-page.component';

const routes: Routes = [

  //Public
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'catalogue', component: CataloguePageComponent },
  { path: 'categories', component: CategoriesPageComponent },
  { path: 'authors', component: AuthorsPageComponent },
  { path: 'books/:id', component: BookDetailPageComponent },
  { path: 'offers', component: OffersPageComponent },
  { path: 'offers/:id', component: OfferDetailPageComponent },
  { path: 'about', component: AboutPageComponent },

  // Auth (guest only)
  {
    path: 'auth',
    canActivate: [GuestAuthGuard],
    component: AuthShellComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginPageComponent },
      { path: 'register', component: RegisterPageComponent },
    ],
  },

  // User (auth required)
  {
    path: 'user',
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile', component: ProfilePageComponent },
    ],
  },

  { path: 'favorites', component: FavoritesPageComponent, canActivate: [AuthGuard] },
  { path: 'loans', component: MyLoansPageComponent, canActivate: [AuthGuard] },

  // roles grouped
  {
    path: 'admin',
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMIN, Role.BIBLIOTHECAIRE] },
    children: [
      { path: '', component: AdminDashboardPageComponent },
      { path: 'categories', component: AdminCategoriesPageComponent },
      { path: 'branches', component: AdminBranchesPageComponent },
      { path: 'partners', component: AdminPartnersPageComponent },
      { path: 'loans', component: AdminLoansPageComponent },
      { path: 'reservations', component: AdminReservationsPageComponent },
      { path: 'books', component: AdminBooksPageComponent },
      { path: 'authors', component: AdminAuthorsPageComponent },
      { path: 'settings', component: AdminLibrarySettingsPageComponent },
      { path: 'moderation', component: AdminModerationPageComponent },
      { path: 'news', component: AdminNewsPageComponent },
    ],
  },

  //Admin only
  {
    path: 'admin',
    children: [
      {
        path: 'users',
        component: AdminUsersPageComponent,
        canActivate: [RoleGuard],
        data: { roles: [Role.ADMIN] },
      },
      {
        path: 'roles',
        component: AdminRolesPageComponent,
        canActivate: [RoleGuard],
        data: { roles: [Role.ADMIN] },
      },
      {
        path: 'offers',
        component: AdminOffersPageComponent,
        canActivate: [RoleGuard],
        data: { roles: [Role.ADMIN] },
      },
    ],
  },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}