import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Contact', href: '/contact' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Safety', href: '/safety' },
      { name: 'Accessibility', href: '/accessibility' },
      { name: 'Cancellation Policy', href: '/cancellation' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Refund Policy', href: '/refunds' },
    ],
  };

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: '📘' },
    { name: 'Twitter', href: '#', icon: '🐦' },
    { name: 'Instagram', href: '#', icon: '📷' },
    { name: 'LinkedIn', href: '#', icon: '💼' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold">TicketHub</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Your premier destination for discovering and booking amazing events, movies, and entertainment experiences. 
              Join millions of users who trust us for their entertainment needs.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  <span className="text-xl">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} TicketHub. All rights reserved.
            </p>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Available on:</span>
              <div className="flex space-x-3">
                <span className="text-gray-400">📱 iOS</span>
                <span className="text-gray-400">🤖 Android</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};