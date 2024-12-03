import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Pagination } from 'react-bootstrap';
import { apiKey } from '../api';

const CLOUDINARY_UPLOAD_PRESET = 'GameNFT';
const CLOUDINARY_CLOUD_NAME = 'dg8b8iuzs';

const ItemsTable = ({ ownerReferenceId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedItem, setSelectedItem] = useState(null);
    const [listingPrice, setListingPrice] = useState('');
    const [showListingModal, setShowListingModal] = useState(false);
    const [listingError, setListingError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editAttributes, setEditAttributes] = useState([]);
    const [editError, setEditError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [marketFilter, setMarketFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setEditError("Kích thước file không được vượt quá 5MB");
                return;
            }

            if (!file.type.startsWith('image/')) {
                setEditError("Vui lòng chọn file hình ảnh");
                return;
            }

            setEditImageFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `https://api.gameshift.dev/nx/items`;
            const params = new URLSearchParams();

            if (ownerReferenceId) {
                params.append('ownerReferenceId', ownerReferenceId);
            }

            switch (marketFilter) {
                case 'forSale':
                    params.append('forSale', 'true');
                    break;
                case 'notForSale':
                    params.append('priceCents', 'null');
                    break;
                default:
                    break;
            }

            url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error('Không thể tải danh sách items');
            }

            const data = await response.json();
            setItems(data.data || []);
        } catch (err) {
            setError('Lỗi khi tải items: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [ownerReferenceId, marketFilter]);

    const filteredItems = items.filter(itemData => {
        const { type, item } = itemData;

        if (type === 'Currency') return false;

        const matchesSearch = 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.attributes && item.attributes.some(attr => 
                attr.traitType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                attr.value.toLowerCase().includes(searchTerm.toLowerCase())
            ));

        if (!matchesSearch) return false;

        if (marketFilter === 'forSale') {
            return item.price && item.price.naturalAmount > 0 && item.status === 'Committed';
        }

        if (marketFilter === 'notForSale') {
            return !item.price || item.price.naturalAmount === 0;
        }

        return true;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    useEffect(() => {
        fetchItems();
    }, [ownerReferenceId, marketFilter, searchTerm, fetchItems]);

    const handleListForSale = async () => {
        if (!selectedItem || !listingPrice) {
            setListingError('Vui lòng nhập giá hợp lệ');
            return;
        }

        setIsProcessing(true);
        setListingError(null);

        try {
            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/list-for-sale`,
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({
                        price: {
                            currencyId: 'USDC',
                            naturalAmount: listingPrice
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể  tài sản');
            }

            const data = await response.json();

            if (data.consentUrl) {
                window.open(data.consentUrl, '_blank', 'noopener,noreferrer');
            }

            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
            setShowListingModal(false);
        }
    };

    const handleCancelSale = async (itemId) => {
        setIsProcessing(true);
        setListingError(null);

        try {
            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${itemId}/cancel-listing`,
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'x-api-key': apiKey
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể hủy bán tài sản');
            }

            const data = await response.json();

            if (data.consentUrl) {
                window.open(data.consentUrl, '_blank', 'noopener,noreferrer');
            }

            await fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const openListingModal = (item) => {
        setSelectedItem(item);
        setListingPrice('');
        setListingError(null);
        setShowListingModal(true);
    };

    const openEditModal = (item) => {
        setEditItem(item);
        setEditImageUrl(item.imageUrl || '');
        setEditImageFile(null);
        setEditImagePreview(null);

        setEditAttributes(item.attributes && item.attributes.length > 0
            ? item.attributes
            : [{ traitType: '', value: '' }]
        );

        setEditError(null);
        setShowEditModal(true);
    };

    const updateAttribute = (index, field, value) => {
        const newAttributes = [...editAttributes];

        if (field === 'traitType') {
            value = value.slice(0, 8);
        }

        newAttributes[index][field] = value;
        setEditAttributes(newAttributes);
    };

    const handleEditAsset = async () => {
        if (!editItem) return;

        if (!editAttributes[0]?.traitType || !editAttributes[0]?.value) {
            setEditError('Vui lòng nhập đầy đủ thông tin Giftcode và Độ hiếm');
            return;
        }

        setIsEditing(true);
        setEditError(null);

        try {
            let newImageUrl = editImageUrl;

            if (editImageFile) {
                newImageUrl = await uploadImageToCloudinary(editImageFile);
            }

            const payload = {
                imageUrl: newImageUrl,
                attributes: editAttributes
            };

            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${editItem.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể chỉnh sửa tài sản');
            }

            await fetchItems();
            setShowEditModal(false);
            setEditImageFile(null);
            setEditImagePreview(null);
        } catch (err) {
            setEditError(err.message);
        } finally {
            setIsEditing(false);
        }
    };

    useEffect(() => {
        const pollInterval = setInterval(() => {
            fetchItems();
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [fetchItems]);

    return (
        <div className="card w-100">
            <div className="card-header ">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Kho Vật Phẩm</h5>
                    <div className="d-flex align-items-center">
                        <input
                            type="text"
                            className="form-control form-control-sm me-2"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '200px' }}
                        />
                        <select
                            className="form-select form-select-sm me-2"
                            style={{ width: 'auto' }}
                            value={marketFilter}
                            onChange={(e) => setMarketFilter(e.target.value)}
                        >
                            <option value="all">Tất Cả</option>
                            <option value="forSale">Đang Được Bán</option>
                            <option value="notForSale">Chưa Được Bán</option>
                        </select>
                        <button
                            onClick={fetchItems}
                            className="btn btn-success btn-sm"
                        >
                            <i className="fas fa-sync-alt me-1"></i> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-body p-0">
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger m-3">{error}</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-5 text-muted">Không tìm thấy items</div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <style>{`
                                body {
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(20px)',
                                    borderRadius: '15px',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                                    border: '1px solid rgba(255, 255, 255, 0.18)'
                                }
                                .bg-soft-background {
                                    background: 'rgba(255, 255, 255, 0.1)';
                                }
                                .table-hover tbody tr:hover {
                                    background-color: rgba(0, 123, 255, 0.05);
                                    transition: background-color 0.3s ease;
                                }
                                .item-image {
                                    width: 50px;
                                    height: 50px;
                                    object-fit: cover;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                }
                                .status-badge {
                                    border-radius: 20px;
                                    font-size: 0.75rem;
                                    padding: 0.25rem 0.5rem;
                                }
                            `}</style>
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th className="text-muted fw-normal">Ảnh</th>
                                        <th className="text-muted fw-normal">Tên</th>
                                        <th className="text-muted fw-normal">Mô tả</th>
                                        <th className="text-muted fw-normal">Giftcode</th>
                                        <th className="text-muted fw-normal">Trạng Thái</th>
                                        <th className="text-muted fw-normal text-end">Hành Động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((itemData, index) => {
                                        const { type, item } = itemData;
                                        if (type === 'Currency') return null;

                                        const isForSale = item.price && item.price.naturalAmount > 0 && item.status === 'Committed';

                                        return (
                                            <tr key={index}>
                                                <td>
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="item-image"
                                                            title={item.name}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="bg-light rounded-3 d-flex align-items-center justify-content-center"
                                                            style={{ width: '50px', height: '50px' }}
                                                        >
                                                            <i className="fas fa-image text-muted"></i>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">{item.name || item.symbol || '-'}</div>
                                                </td>
                                                <td>
                                                    <div
                                                        className="text-truncate text-secondary"
                                                        style={{ maxWidth: '200px' }}
                                                        title={item.description}
                                                    >
                                                        {item.description || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {item.attributes && item.attributes.length > 0 ? (
                                                        <ul className="list-unstyled mb-0">
                                                            {item.attributes.map((attr, index) => (
                                                                <li key={index}>
                                                                    <span className="fw-bold">{attr.traitType}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {isForSale ? (
                                                        <span className="badge bg-success status-badge">
                                                            Đang Bán
                                                            <br />
                                                            <small>{(item.price.naturalAmount / 100).toFixed(2)} USDC</small>
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary status-badge">Chưa Bán</span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {type === 'UniqueAsset' && (
                                                        <div className="btn-group" role="group">
                                                            {isForSale ? (
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => handleCancelSale(item.id)}
                                                                    disabled={isProcessing}
                                                                >
                                                                    <i className="fas fa-times-circle me-1"></i>
                                                                    {isProcessing ? 'Đang Xử Lý...' : 'Hủy Bán'}
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => openEditModal(item)}
                                                                    >
                                                                        <i className="fas fa-edit me-1"></i>Xem
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={() => openListingModal(item)}
                                                                    >
                                                                        <i className="fas fa-tag me-1"></i>Bán
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="card-footer border-top-0 d-flex justify-content-between align-items-center px-3 py-2">
                            <div className="d-flex align-items-center">
                                <span className="text-muted me-2">Hiển thị:</span>
                                <select
                                    className="form-select form-select-sm rounded-pill"
                                    style={{ width: 'auto' }}
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    {[5, 10, 20, 50].map(size => (
                                        <option key={size} value={size}>
                                            {size} mục
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Pagination className="mb-0">
                                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                                <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />

                                {(() => {
                                    const paginationItems = [];
                                    const maxPagesToShow = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                                    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                                    if (endPage - startPage + 1 < maxPagesToShow) {
                                        startPage = Math.max(1, endPage - maxPagesToShow + 1);
                                    }

                                    for (let number = startPage; number <= endPage; number++) {
                                        paginationItems.push(
                                            <Pagination.Item
                                                key={number}
                                                active={number === currentPage}
                                                onClick={() => setCurrentPage(number)}
                                            >
                                                {number}
                                            </Pagination.Item>
                                        );
                                    }

                                    return paginationItems;
                                })()}

                                <Pagination.Next onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} />
                                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                            </Pagination>
                        </div>
                    </>
                )}
            </div>

            <Modal show={showListingModal} onHide={() => setShowListingModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Tài Sản Bán</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {listingError && (
                        <Alert variant="danger">{listingError}</Alert>
                    )}

                    <Form>
                        <Form.Group>
                            <Form.Label>Tên Tài Sản</Form.Label>
                            <Form.Control
                                type="text"
                                value={selectedItem?.name || ''}
                                readOnly
                            />
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label>Giá (USDC)</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="Nhập giá (USDC)"
                                value={listingPrice}
                                onChange={(e) => setListingPrice(e.target.value)}
                                min="0.01"
                                step="0.01"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowListingModal(false)}
                        disabled={isProcessing}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleListForSale}
                        disabled={isProcessing || !listingPrice}
                    >
                        {isProcessing ? 'Đang Xử Lý...' : 'Bán'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                centered
                size="xl"
                dialogClassName="modal-custom"
            >
                <Modal.Header
                    closeButton
                    className="bg-gradient-primary text-dark"
                >
                    <Modal.Title className="w-100 text-center">
                        Xem Chi Tiết Vật Phẩm
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light">
                    {editError && (
                        <Alert variant="danger">{editError}</Alert>
                    )}

                    <div className="row">
                        <div className="col-md-5">
                            <div
                                className="image-preview-container mb-3 bg-white p-3 rounded shadow-sm"
                                style={{ height: '400px' }}
                            >
                                {(editImagePreview || editImageUrl) ? (
                                    <img
                                        src={editImagePreview || editImageUrl}
                                        alt="Preview"
                                        className="img-fluid rounded w-100 h-100"
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                                        Chưa có hình ảnh
                                    </div>
                                )}
                            </div>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageChange}
                                className="mb-2"
                                disabled={isEditing}
                            />
                        </div>

                        <div className="col-md-7">
                            <Form.Group className="mb-3">
                                <Form.Label>Tên Vật Phẩm</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editItem?.name || ''}
                                    readOnly
                                    className="bg-white"
                                />
                            </Form.Group>

                            <div className="bg-white p-3 rounded shadow-sm">
                                <h5 className="mb-3">Chi Tiết Vật Phẩm</h5>
                                {editAttributes.map((attr, index) => (
                                    <div key={index} className="row mb-2 g-2">
                                        <div className="col-md-6">
                                            <Form.Control
                                                type="text"
                                                placeholder="Nhập Giftcode"
                                                value={attr.traitType}
                                                onChange={(e) => updateAttribute(index, 'traitType', e.target.value)}
                                                maxLength={8}
                                                className="form-control"
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <Form.Select
                                                value={attr.value}
                                                onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                                                className="form-control"
                                                required
                                            >
                                                <option value="">Chọn Độ Hiếm</option>
                                                <option value="Common">Common</option>
                                                <option value="Rare">Rare</option>
                                                <option value="Epic">Epic</option>
                                                <option value="Legendary">Legendary</option>
                                            </Form.Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button
                        variant="secondary"
                        onClick={() => setShowEditModal(false)}
                        disabled={isEditing}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleEditAsset}
                        disabled={isEditing}
                    >
                        {isEditing ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};

export default ItemsTable;

