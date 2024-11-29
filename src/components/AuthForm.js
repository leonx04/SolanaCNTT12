import React, { useEffect, useState } from 'react';
import axios from 'axios';
import unidecode from 'unidecode';
import { apiKey } from '../api';

const PHANTOM_WALLET_DOWNLOAD_LINK = "https://phantom.app/download";
const API_BASE_URL = "https://api.gameshift.dev/nx/users";

const AuthForm = ({ setIsLoggedIn, setUserData }) => {
  const [formData, setFormData] = useState({
    referenceId: '',
    email: '',
    externalWalletAddress: ''
  });

  const [formErrors, setFormErrors] = useState({
    referenceId: '',
    email: '',
    phantomWallet: ''
  });

  const [authState, setAuthState] = useState({
    isRegistering: false,
    isLoading: false,
    isPhantomInstalled: false,
    isFormVisible: true
  });

  useEffect(() => {
    setAuthState(prev => ({
      ...prev,
      isPhantomInstalled: !!(window.solana && window.solana.isPhantom)
    }));
  }, []);

  const validateField = (name, value) => {
    switch (name) {
      case 'referenceId':
        return value.trim() ? '' : 'Tên tài khoản không được để trống';
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? ''
          : 'Địa chỉ email không hợp lệ';
      default:
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = unidecode(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    setFormErrors(prev => ({
      ...prev,
      [name]: validateField(name, sanitizedValue)
    }));
  };

  const connectPhantomWallet = async () => {
    if (!authState.isPhantomInstalled) {
      setFormErrors(prev => ({
        ...prev,
        phantomWallet: 'Phantom Wallet chưa được cài đặt'
      }));
      return null;
    }

    try {
      const resp = await window.solana.connect();
      return resp.publicKey.toString();
    } catch (err) {
      setFormErrors(prev => ({
        ...prev,
        phantomWallet: 'Kết nối ví Phantom thất bại'
      }));
      return null;
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const newErrors = {
      referenceId: validateField('referenceId', formData.referenceId),
      email: validateField('email', formData.email),
      phantomWallet: authState.isRegistering && !authState.isPhantomInstalled
        ? 'Phantom Wallet chưa được cài đặt'
        : ''
    };

    setFormErrors(newErrors);

    // Check if there are any errors
    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      if (authState.isRegistering) {
        const walletAddress = await connectPhantomWallet();
        if (!walletAddress) return;

        await axios.post(API_BASE_URL, {
          referenceId: formData.referenceId,
          email: formData.email,
          externalWalletAddress: walletAddress
        }, {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': apiKey
          }
        });
      } else {
        const response = await axios.get(`${API_BASE_URL}/${formData.referenceId}`, {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey
          }
        });

        if (response.data.email !== formData.email) {
          throw new Error('Email không khớp');
        }
      }

      // Thành công
      setTimeout(() => {
        setUserData(formData);
        setIsLoggedIn(true);
        setAuthState(prev => ({ ...prev, isFormVisible: false }));
      }, 1500);

    } catch (err) {
      setFormErrors(prev => ({
        ...prev,
        submit: err.response?.status === 409
          ? 'Tài khoản đã tồn tại'
          : 'Đã xảy ra lỗi. Vui lòng thử lại sau'
      }));
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Render loading spinner
  if (!authState.isFormVisible) {
    return (
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <div className="spinner-grow text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg rounded-4 border-0">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <img
                  src="https://raw.githubusercontent.com/leonx04/SolanaCNTT12/refs/heads/main/public/favicon.ico"
                  alt="Authentication"
                  className="rounded-circle mb-3"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
                <h2 className="fw-bold mb-2">
                  {authState.isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}
                </h2>
                <p className="text-muted">
                  {authState.isRegistering
                    ? 'Tạo tài khoản mới của bạn'
                    : 'Đăng nhập để truy cập tài khoản'}
                </p>
              </div>

              <div>
                <div className="mb-3">
                  <input
                    type="text"
                    className={`form-control form-control-lg ${formErrors.referenceId ? 'is-invalid' : ''}`}
                    placeholder="Tên tài khoản"
                    name="referenceId"
                    value={formData.referenceId}
                    onChange={handleInputChange}
                    disabled={authState.isLoading}
                  />
                  {formErrors.referenceId && (
                    <div className="invalid-feedback">{formErrors.referenceId}</div>
                  )}
                </div>

                <div className="mb-3">
                  <input
                    type="email"
                    className={`form-control form-control-lg ${formErrors.email ? 'is-invalid' : ''}`}
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={authState.isLoading}
                  />
                  {formErrors.email && (
                    <div className="invalid-feedback">{formErrors.email}</div>
                  )}
                </div>

                {authState.isRegistering && !authState.isPhantomInstalled && (
                  <div className="alert alert-warning text-center small mb-3">
                    Cài đặt Phantom Wallet để tiếp tục
                    <a
                      href={PHANTOM_WALLET_DOWNLOAD_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alert-link ms-1"
                    >
                      Tải ngay
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  className={`btn btn-${authState.isRegistering ? 'dark' : 'primary'} btn-lg w-100`}
                  onClick={handleSubmit}
                  disabled={authState.isLoading || (authState.isRegistering && !authState.isPhantomInstalled)}
                >
                  {authState.isLoading ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Đang xử lý...</span>
                    </div>
                  ) : (
                    <span>{authState.isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}</span>
                  )}
                </button>

                {formErrors.submit && (
                  <div className="alert alert-danger text-center small mt-3 mb-0">
                    {formErrors.submit}
                  </div>
                )}

                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none text-muted"
                    onClick={() => setAuthState(prev => ({
                      ...prev,
                      isRegistering: !prev.isRegistering
                    }))}
                    disabled={authState.isLoading}
                  >
                    {authState.isRegistering
                      ? 'Đã có tài khoản? Đăng nhập'
                      : 'Chưa có tài khoản? Đăng ký'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;