import React from 'react';
import { Logo } from './logo';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInstagram,
  faFacebookF,
  faLinktree
} from '@fortawesome/free-brands-svg-icons';

export const Footer = () => {
  return (
    <footer className="bg-black border-t border-green-500/20 pt-12 pb-8 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-green-500/5 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Logo />

            <div className="flex space-x-4">
              {/* Instagram */}
              <Link
                href={process.env.NEXT_PUBLIC_INSTAGRAM_LINK || ''}
                className="flex items-center gap-2 text-white bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-4 py-2 rounded-sm hover:opacity-90 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faInstagram} size="lg" />
                <span>Instagram</span>
              </Link>

              {/* Linktree */}
              <Link
                href={process.env.NEXT_PUBLIC_LINKTREE_LINK || ''}
                className="flex items-center gap-2 text-white bg-green-500 px-4 py-2 rounded-sm hover:bg-green-600 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faLinktree} size="lg" />
                <span>Linktree</span>
              </Link>

              {/* Facebook */}
              <Link
                href={process.env.NEXT_PUBLIC_FACEBOOK_LINK || ''}
                className="flex items-center gap-2 text-white bg-[#1877F2] px-4 py-2 rounded-sm hover:bg-[#165DBE] transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faFacebookF} size="lg" />
                <span>Facebook</span>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium mb-4">Company</h3>
            <ul className="space-y-2">
              {['About', 'Features', 'Pricing', 'FAQ', 'Contact'].map(
                (item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Sinar Utama Mie Ayam Setiap Hari.
            All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-gray-300 text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 text-sm">
              Legal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
