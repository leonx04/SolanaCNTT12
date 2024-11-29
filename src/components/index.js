return (
    <div className="marketplace-container position-relative" style={{
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        minHeight: '100vh',
        color: '#ffffff'
    }}>
        <div className="container py-5">
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

            {/* Pagination and Controls */}
            <div className="row mb-4 g-3 align-items-center">
                <div className="col-12 col-md-4">
                    <div className="d-flex align-items-center text-white">
                        <span className="me-3">Hiển thị: {currentItems.length} / {totalResults} sản phẩm</span>
                        <Form.Select
                            size="sm"
                            className="bg-dark text-white border-secondary"
                            value={perPage}
                            onChange={(e) => changePerPage(Number(e.target.value))}
                        >
                            {[5, 10, 20, 50].map((num) => (
                                <option key={num} value={num} className="bg-dark">
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

            {/* Product Grid */}
            <div className="row row-cols-1 row-cols-md-3 g-4">
                {currentItems.map((itemData) => {
                    const item = itemData.item;
                    return (
                        <div key={item.id} className="col">
                            <div
                                className="card h-100 bg-transparent border-0 card-hover-effect"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(15px)',
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
                                        {`$${(item.priceCents / 100).toFixed(2)} USDC`}
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
                                        Mua ngay
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Update Time & Manual Refresh */}
        <div
            className="position-fixed bottom-0 end-0 m-4 text-white"
            style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
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

        {/* Giữ nguyên Modal mua hàng như ban đầu */}
        {selectedItem && (
            <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Xác nhận mua {selectedItem.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-6">
                            <img
                                src={selectedItem.imageUrl}
                                alt={selectedItem.name}
                                className="img-fluid mb-3 rounded"
                                style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <div className="col-md-6">
                            <h5 className="mb-3">Chi tiết sản phẩm</h5>
                            <div className="card mb-3">
                                <div className="card-body">
                                    <p className="card-text">
                                        <strong>Tên:</strong> {selectedItem.name}
                                    </p>
                                    <p className="card-text">
                                        <strong>Mô tả:</strong> {selectedItem.description || 'Không có mô tả'}
                                    </p>
                                    <p className="card-text">
                                        <strong>Giá:</strong> ${(selectedItem.priceCents / 100).toFixed(2)} USDC
                                    </p>
                                </div>
                            </div>

                            {selectedItem.attributes && selectedItem.attributes.length > 0 && (
                                <div className="card">
                                    <div className="card-header">Thuộc tính</div>
                                    <ul className="list-group list-group-flush">
                                        {selectedItem.attributes.map((attr, index) => (
                                            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                                <span className="text-muted">********</span>
                                                <span className="badge bg-primary rounded-pill">{attr.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {buyError && (
                                <Alert variant="danger" className="mt-3">
                                    {buyError}
                                </Alert>
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setSelectedItem(null)} disabled={buyLoading}>
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={buyItemWithPhantomWallet}
                        disabled={buyLoading}
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
                </Modal.Footer>
            </Modal>
        )}
    </div>
);