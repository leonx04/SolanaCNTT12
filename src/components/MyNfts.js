import React, { useState } from 'react';
import { Alert, Button, Modal, ProgressBar } from 'react-bootstrap';
import { apiKey } from '../api';
import ItemsTable from './ItemsTable';

const CreateProduct = ({ referenceId, collectionId, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null,
    traitType: '',
    rarity: ''
  });

  const [preview, setPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const CLOUDINARY_UPLOAD_PRESET = 'GameNFT';
  const CLOUDINARY_CLOUD_NAME = 'dg8b8iuzs';

  const RARITY_OPTIONS = [
    'Common', 
    'Rare', 
    'Epic', 
    'Legendary', 
    'Mythic'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: null,
      traitType: '',
      rarity: ''
    });
    setPreview(null);
    setFormErrors({});
    setError(null);
    setUploadProgress(0);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Tên vật phẩm là bắt buộc";
    } else if (formData.name.length > 32) {
      errors.name = "Tên không được vượt quá 32 ký tự";
    }

    if (!formData.description.trim()) {
      errors.description = "Mô tả là bắt buộc";
    } else if (formData.description.length > 64) {
      errors.description = "Mô tả không được vượt quá 64 ký tự";
    }

    if (!formData.image) {
      errors.image = "Hình ảnh là bắt buộc";
    }

    if (!formData.traitType.trim()) {
      errors.traitType = "Giftcode là bắt buộc";
    } else if (!/^[a-zA-Z0-9]{1,8}$/.test(formData.traitType)) {
      errors.traitType = "Giftcode phải có 1-8 ký tự chữ và số";
    }

    if (!formData.rarity) {
      errors.rarity = "Độ hiếm là bắt buộc";
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({
          ...prev,
          image: "Kích thước file không được vượt quá 5MB"
        }));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({
          ...prev,
          image: "Vui lòng chọn file hình ảnh"
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (formErrors.image) {
        setFormErrors(prev => ({
          ...prev,
          image: null
        }));
      }
    }
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', process.env.REACT_APP_CLOUDINARY_API_KEY);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      throw new Error('Không thể tải lên hình ảnh. Vui lòng thử lại. Chi tiết: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      const imageUrl = await uploadImageToCloudinary(formData.image);
      setUploadProgress(50);

      if (!imageUrl) {
        throw new Error('Không nhận được URL hình ảnh từ Cloudinary');
      }

      const payload = {
        details: {
          collectionId: collectionId,
          name: formData.name,
          description: formData.description,
          imageUrl: imageUrl,
          attributes: [
            {
              traitType: formData.traitType,
              value: formData.rarity
            }
          ]
        },
        destinationUserReferenceId: referenceId
      };

      setUploadProgress(75);
      
      const response = await fetch('https://api.gameshift.dev/nx/unique-assets', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setUploadProgress(100);
      const data = await response.json();
      
      setIsSuccess(true);
      setResultMessage("Tạo vật phẩm thành công!");
      resetForm();
      setShowModal(false);

      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err) {
      console.error('Error creating product:', err);
      setIsSuccess(false);
      setResultMessage(err.message || "Không thể tạo vật phẩm. Vui lòng thử lại sau");
    } finally {
      setIsSubmitting(false);
      setShowResultModal(true);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div>
      <div className="mb-4">
        <Button variant="success" onClick={() => setShowModal(true)}>
          Tạo vật phẩm mới
        </Button>
      </div>

      <div className="mt-4">
        <ItemsTable ownerReferenceId={referenceId} />
      </div>

      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="theme-text">Tạo vật phẩm mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Tên vật phẩm</label>
                  <input 
                    type="text" 
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên vật phẩm"
                    disabled={isSubmitting}
                    maxLength={32}
                  />
                  {formErrors.name && (
                    <div className="invalid-feedback">{formErrors.name}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Mô tả</label>
                  <textarea 
                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Mô tả về vật phẩm"
                    disabled={isSubmitting}
                    maxLength={64}
                  />
                  {formErrors.description && (
                    <div className="invalid-feedback">{formErrors.description}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Giftcode</label>
                  <input 
                    type="text" 
                    className={`form-control ${formErrors.traitType ? 'is-invalid' : ''}`}
                    name="traitType"
                    value={formData.traitType}
                    onChange={handleInputChange}
                    placeholder="Nhập Giftcode"
                    disabled={isSubmitting}
                    maxLength={8}
                  />
                  {formErrors.traitType && (
                    <div className="invalid-feedback">{formErrors.traitType}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Độ hiếm</label>
                  <select
                    className={`form-control ${formErrors.rarity ? 'is-invalid' : ''}`}
                    name="rarity"
                    value={formData.rarity}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Chọn độ hiếm</option>
                    {RARITY_OPTIONS.map(rarity => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                  </select>
                  {formErrors.rarity && (
                    <div className="invalid-feedback">{formErrors.rarity}</div>
                  )}
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Hình ảnh</label>
                  <input 
                    type="file" 
                    className={`form-control ${formErrors.image ? 'is-invalid' : ''}`}
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                  />
                  {formErrors.image && (
                    <div className="invalid-feedback">{formErrors.image}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    Hỗ trợ: JPG, PNG, GIF (Max: 5MB)
                  </small>

                  {preview && (
                    <div className="mt-3 text-center">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="img-fluid rounded"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px', 
                          objectFit: 'contain' 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="mt-3">
                <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang tạo...
              </>
            ) : (
              'Tạo vật phẩm'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Result Modal */}
      <Modal show={showResultModal} onHide={() => setShowResultModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isSuccess ? 'Thành công' : 'Lỗi'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={isSuccess ? 'success' : 'danger'}>
            {resultMessage}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowResultModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CreateProduct;