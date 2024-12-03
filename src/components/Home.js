import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner, Dropdown } from 'react-bootstrap';
import { apiKey } from '../api';

const usePagination = (items, initialPerPage = 10) => {
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: initialPerPage,
    totalPages: 0,
    totalResults: 0
  });

  const paginatedItems = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;

    return {
      currentItems: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / pagination.perPage),
      totalResults: items.length
    };
  }, [items, pagination.currentPage, pagination.perPage]);

  const changePage = useCallback((newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  }, []);

  const changePerPage = useCallback((newPerPage) => {
    setPagination(prev => ({
      ...prev,
      perPage: newPerPage,
      currentPage: 1
    }));
  }, []);

  return {
    ...pagination,
    currentItems: paginatedItems.currentItems,
    totalPages: paginatedItems.totalPages,
    totalResults: paginatedItems.totalResults,
    changePage,
    changePerPage
  };
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSide = Math.floor((maxPagesToShow - 3) / 2);

    if (currentPage <= maxPagesToShow - 2) {
      return [
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) => i + 1),
        '...',
        totalPages
      ];
    }

    if (currentPage > totalPages - (maxPagesToShow - 2)) {
      return [
        1,
        '...',
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) =>
          totalPages - (maxPagesToShow - 2) + i
        )
      ];
    }

    return [
      1,
      '...',
      ...Array.from({ length: maxPagesToShow - 2 }, (_, i) =>
        currentPage - leftSide + i
      ),
      '...',
      totalPages
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav>
      <ul className="pagination mb-0 justify-content-center">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &#10094; Trước
          </Button>
        </li>

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <li key={`ellipsis-${index}`} className="page-item">
                <span className="page-link text-muted">...</span>
              </li>
            );
          }

          return (
            <li
              key={page}
              className={`page-item ${currentPage === page ? 'active' : ''}`}
            >
              <Button
                variant={currentPage === page ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="mx-1"
              >
                {page}
              </Button>
            </li>
          );
        })}

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Tiếp &#10095;
          </Button>
        </li>
      </ul>
    </nav>
  );
};

const sortItems = (items, sortOrder) => {
  switch (sortOrder) {
    case 'price-high-low':
      return [...items].sort((a, b) => parseFloat(b.item.price.naturalAmount) - parseFloat(a.item.price.naturalAmount));
    case 'price-low-high':
      return [...items].sort((a, b) => parseFloat(a.item.price.naturalAmount) - parseFloat(b.item.price.naturalAmount));
    case 'name-a-z':
      return [...items].sort((a, b) => a.item.name.localeCompare(b.item.name));
    case 'name-z-a':
      return [...items].sort((a, b) => b.item.name.localeCompare(a.item.name));
    default:
      return items;
  }
};

const MarketplaceHome = ({ referenceId }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [sortOrder, setSortOrder] = useState('default');
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    const filtered = allItems.filter(itemData =>
      itemData.type === 'UniqueAsset' &&
      itemData.item.price && itemData.item.price.naturalAmount !== null &&
      itemData.item.owner.referenceId !== referenceId &&
      itemData.item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return sortItems(filtered, sortOrder);
  }, [allItems, referenceId, sortOrder, searchTerm]);

  const fetchAllItems = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const fetchPage = async (page) => {
        const response = await axios.get('https://api.gameshift.dev/nx/items', {
          signal,
          params: {
            perPage: 100,
            page: page,
            collectionId: 'fd849a9c-13dc-44ff-a962-66d1ba30fc1a',
          },
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
          },
        });
        return response.data;
      };

      let allFetchedItems = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { data, meta } = await fetchPage(page);
        allFetchedItems.push(...data);
        totalPages = meta.totalPages;
        page++;
      }

      const hasChanged = JSON.stringify(allFetchedItems) !== JSON.stringify(allItems);

      if (hasChanged) {
        setAllItems(allFetchedItems);
        setLastFetchTime(Date.now());
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        setError('Không thể tải danh sách sản phẩm: ' + err.message);
        console.error('Fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [allItems]);

  const handleManualRefresh = () => {
    fetchAllItems();
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchAllItems();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAllItems]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        await fetchAllItems(controller.signal);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }
        console.error('Fetch error:', err);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [fetchAllItems]);

  const {
    currentItems,
    currentPage,
    totalPages,
    totalResults,
    perPage,
    changePage,
    changePerPage
  } = usePagination(filteredItems);

  const handleBuyItem = async (itemData) => {
    setSelectedItem(itemData.item);
    setBuyError(null);
  };

  const buyItemWithPhantomWallet = async () => {
    setBuyLoading(true);
    setBuyError(null);

    try {
      const provider = window.phantom?.solana;
      if (!provider || !provider.isConnected) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
      }

      const response = await axios.post(
        `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/buy`,
        {
          buyerId: referenceId
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': apiKey
          }
        }
      );

      const { consentUrl } = response.data;
      window.open(consentUrl, '_blank');
      fetchAllItems();
    } catch (err) {
      console.error('Lỗi mua sản phẩm:', err);

      const errorMessage = err.response?.data?.message ||
        err.message ||
        'Không thể thực hiện giao dịch. Vui lòng thử lại.';

      setBuyError(errorMessage);
    } finally {
      setBuyLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        {error}
        <Button
          variant="outline-primary"
          className="ms-3"
          onClick={() => fetchAllItems()}
        >
          Thử lại
        </Button>
      </Alert>
    );
  }

  return (
    <div className="marketplace-container position-relative" style={{
      minHeight: '500px',
      color: '#ffffff'
    }}>
      <div className="container py-5">
        <div className="mb-5">
          <div className="p-5 text-center bg-image rounded-3" style={{
            backgroundImage: "url('https://static.vecteezy.com/system/resources/previews/004/727/152/non_2x/illustration-of-a-non-fungible-token-nft-background-for-infographics-digital-technology-concept-crypto-art-futuristic-neon-wallpaper-with-typography-vector.jpg')",
            height: '300px',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            <div className="mask" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-white">
                  <h1 className="mb-3">Chào mừng</h1>
                  <h4 className="mb-3">Đến với thế giới NFT</h4>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold text-white mb-3" style={{
            background: 'linear-gradient(90deg, #00d2ff 0%, #7e51ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Marketplace
          </h1>
          <p className="lead text-white-50">Khám phá và sở hữu những tài sản độc đáo</p>
        </div>

        <div className="row mb-4 g-3 align-items-center">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center text-white">
              <span className="me-3">Hiển thị: {currentItems.length} / {totalResults} sản phẩm</span>
              <Form.Select
                size="sm"
                className="text-white"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(15px)',
                  borderRadius: '15px',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                  border: '1px solid rgba(255, 255, 255, 0.18)'
                }}
                value={perPage}
                onChange={(e) => changePerPage(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map((num) => (
                  <option key={num} value={num} className="text-dark">
                    {num} sản phẩm/trang
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

          <div className="col-12 col-md-4 d-flex justify-content-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          </div>
        </div>

        <div className="mb-4">
          <Form.Control
            placeholder="Tìm kiếm items..."
            aria-label="Tìm kiếm items"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="d-flex justify-content-end mb-3 text-white">
          <Dropdown>
            <Dropdown.Toggle variant="secondary" id="dropdown-sort">
              Sort BySort By
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setSortOrder('default')}>Default</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortOrder('price-high-low')}>Price: High to Low</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortOrder('price-low-high')}>Price: Low to High</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortOrder('name-a-z')}>Name: A to Z</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortOrder('name-z-a')}>Name: Z to A</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-5">
            <h2 className="text-muted">Không tìm thấy sản phẩm phù hợp</h2>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {currentItems.map((itemData) => {
              const item = itemData.item;
              return (
                <div key={item.id} className="col">
                  <div
                    className="card h-100 bg-transparent border-0 card-hover-effect"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '15px',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                      border: '1px solid rgba(255, 255, 255, 0.18)'
                    }}
                  >
                    <div
                      className="card-img-top position-relative overflow-hidden"
                      style={{
                        height: '250px',
                        borderTopLeftRadius: '15px',
                        borderTopRightRadius: '15px',
                        background: `url(${item.imageUrl || '/default-image.jpg'}) center/cover no-repeat`
                      }}
                    >
                      <div
                        className="position-absolute top-0 end-0 m-3 badge bg-dark bg-opacity-50"
                        style={{ backdropFilter: 'blur(5px)' }}
                      >
                        {`$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}`}
                      </div>
                    </div>

                    <div className="card-body text-white">
                      <h5 className="card-title fw-bold mb-2">{item.name}</h5>
                      <p className="card-text text-white-50 mb-3">
                        Tác giả: {item.owner.referenceId}
                      </p>

                      <Button
                        variant="outline-light"
                        className="w-100 mt-auto"
                        onClick={() => handleBuyItem(itemData)}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none'
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="position-fixed bottom-0 end-0 m-4 text-white"
        style={{
          backdropFilter: 'blur(5px)',
          borderRadius: '10px',
          padding: '10px 20px'
        }}
      >
        <small>
          Cập nhật: {new Date(lastFetchTime).toLocaleString()}
          <Button
            variant="outline-light"
            size="sm"
            className="ms-2"
            onClick={handleManualRefresh}
          >
            Làm mới
          </Button>
        </small>
      </div>

      {selectedItem && (
        <Modal
          show={!!selectedItem}
          onHide={() => setSelectedItem(null)}
          size="lg"
          centered
          className="product-purchase-modal"
        >
          <Modal.Header closeButton className="border-bottom-0 pb-0">
            <Modal.Title className="w-100 text-center fs-4 fw-bold">
              Xác nhận mua {selectedItem.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="container-fluid">
              <div className="row g-4">
                <div className="col-md-5">
                  <div className="position-relative">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="img-fluid rounded-3 shadow-sm"
                      style={{
                        height: '320px',
                        width: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="d-flex flex-column h-100">
                    <div className="product-details mb-4">
                      <h5 className="mb-3 text-muted">Chi tiết sản phẩm</h5>
                      <div className="bg-light p-3 rounded-3">
                        <div className="mb-2">
                          <span className="fw-bold me-2">Tên:</span>
                          <span>{selectedItem.name}</span>
                        </div>
                        <div className="mb-2">
                          <span className="fw-bold me-2">Mô tả:</span>
                          <span>{selectedItem.description || 'Không có mô tả'}</span>
                        </div>
                        <div>
                          <span className="fw-bold me-2">Giá:</span>
                          <span className="text-primary fw-bold">
                            ${parseFloat(selectedItem.price.naturalAmount).toFixed(2)} ${selectedItem.price.currencyId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedItem.attributes && selectedItem.attributes.length > 0 && (
                      <div className="attributes-section mb-4">
                        <h5 className="mb-3 text-muted">Độ hiếm</h5>
                        <div className="bg-light rounded-3 overflow-hidden">
                          {selectedItem.attributes.map((attr, index) => (
                            <div
                              key={index}
                              className={`d-flex justify-content-between align-items-center p-2 ${index < selectedItem.attributes.length - 1 ? 'border-bottom' : ''
                                }`}
                            >
                              <span className="badge bg-primary rounded-pill">
                                {attr.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {buyError && (
                      <Alert variant="danger" className="mt-auto">
                        {buyError}
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top-0 pt-0">
            <div className="w-100 d-flex justify-content-between">
              <Button
                variant="outline-secondary"
                onClick={() => setSelectedItem(null)}
                disabled={buyLoading}
                className="px-4"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={buyItemWithPhantomWallet}
                disabled={buyLoading}
                className="px-4"
              >
                {buyLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận mua'
                )}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default MarketplaceHome;

