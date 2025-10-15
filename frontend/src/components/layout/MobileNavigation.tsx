import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CalendarIcon, 
  FilmIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, 
  CalendarIcon as CalendarIconSolid, 
  FilmIcon as FilmIconSolid, 
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts';
import { Button } from '../ui';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid
  },
  {
    name: 'Events',
    href: '/events',
    icon: CalendarIcon,
    iconSolid: CalendarIconSolid
  },
  {
    name: 'Movies',
    href: '/movies',
    icon: FilmIcon,
    iconSolid: FilmIconSolid
  },
  {
    name: 'Profile',
    href: '/dashboard',
    icon: UserIcon,
    iconSolid: UserIconSolid,
    requiresAuth: true
  }
];

export const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const filteredItems = navigationItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && user)
  );

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {filteredItems.slice(0, 4).map((item) => {
            const isActive = isActiveRoute(item.href);
            const IconComponent = isActive ? item.iconSolid : item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1
                  transition-colors duration-200
                  ${isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-600 hover:text-blue-600'
                  }
                `}
              >
                <IconComponent className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 text-gray-600 hover:text-blue-600 transition-colors duration-200"
          >
            <Bars3Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Screen Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(false)}
              className="p-2"
            >
              <XMarkIcon className="w-6 h-6" />
            </Button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto">
            {/* User Section */}
            {user && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <UserIconSolid className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName || user.email}
                    </p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="py-4">
              {navigationItems.map((item) => {
                if (item.requiresAuth && !user) return null;
                
                const isActive = isActiveRoute(item.href);
                const IconComponent = isActive ? item.iconSolid : item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center space-x-3 px-4 py-3 transition-colors duration-200
                      ${isActive 
                        ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600' 
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <IconComponent className="w-6 h-6" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Additional Menu Items */}
            <div className="border-t border-gray-200 py-4">
              <Link
                to="/search"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="font-medium">Search</span>
              </Link>
              
              <Link
                to="/help"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Help & Support</span>
              </Link>
            </div>

            {/* Auth Section */}
            {!user && (
              <div className="border-t border-gray-200 p-4 space-y-3">
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="lg" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};