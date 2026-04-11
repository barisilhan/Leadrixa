function apiUrl(path) {
    if (path.startsWith('http')) return path;
    return 'http://localhost:5000' + path;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function badgeForTemperature(temp) {
    switch ((temp || '').toLowerCase()) {
        case 'sıcak': return '<span class="badge badge-hot">Sıcak</span>';
        case 'ılık': return '<span class="badge badge-warm">Ilık</span>';
        case 'soğuk': return '<span class="badge badge-cold">Soğuk</span>';
        default: return '<span class="badge badge-light-purple">' + (temp || 'Bilinmiyor') + '</span>';
    }
}

function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function showError(message) {
    alert(message || 'Bir hata oluştu.');
}

function loadLoginPage() {
    $('#loginForm').on('submit', function(event) {
        event.preventDefault();
        var email = $('#email').val();
        var password = $('#password').val();

        $.ajax({
            url: apiUrl('/api/auth/login'),
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            success: function() {
                window.location.href = 'dashboard.html';
            },
            error: function() {
                showError('Email veya şifre hatalı.');
            }
        });
    });
}

function loadDashboardPage() {
    if ($('#kpiTotalLeads').length === 0) return;

    $.get(apiUrl('/api/dashboard/summary'), function(data) {
        $('#kpiTotalLeads').text(data.totalLeads);
        $('#kpiHotLeads').text(data.hotLeads);
        $('#kpiWarmLeads').text(data.warmLeads);
        $('#kpiConversion').text(data.conversionRate + '%');
        $('#kpiAverageScore').text(data.averageScore);

        if (data.pipelineStats && window.$('#pipelineList').length) {
            var pl = $('#pipelineList');
            pl.empty();
            var maxCount = Math.max(...data.pipelineStats.map(x => x.count), 1);
            if (data.pipelineStats.reduce((a,b)=>a+b.count,0) === 0) maxCount = 1;
            
            data.pipelineStats.forEach(function(stat) {
                var width = Math.max((stat.count / maxCount) * 100, 15);
                var colorClass = stat.status === 'Skorlandı' ? 'pipe-skorlandi' :
                                 stat.status === 'Nurturing' ? 'pipe-nurturing' :
                                 stat.status === 'Teklif' ? 'pipe-teklif' :
                                 stat.status === 'Kazanıldı' ? 'pipe-kazanildi' : 'pipe-kaybedildi';
                
                var row = '<div class="pipeline-item">' +
                    '<span class="pipeline-label">' + stat.status + '</span>' +
                    '<div class="pipeline-bar-wrapper">' +
                        '<div class="pipeline-bar-fill ' + colorClass + '" style="width:' + width + '%">' +
                            '<div class="pipeline-count">' + stat.count + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
                pl.append(row);
            });
        }

        if (data.recentLeads && window.$('#recentLeadsList').length) {
            var rl = $('#recentLeadsList');
            rl.empty();
            data.recentLeads.forEach(function(lead) {
                var avatar = lead.fullName ? lead.fullName.charAt(0).toUpperCase() : '-';
                var tClass = lead.temperature === 'Sıcak' ? 'b-sicak' : lead.temperature === 'Ilık' ? 'b-ilik' : 'b-soguk';
                var sClass = lead.status === 'Kazanıldı' ? 'b-kazanildi' : (lead.status === 'Skorlandı' ? 'b-skorlandi' : 'b-yeni');
                var statusText = lead.status || 'Yeni';
                var tempText = lead.temperature || 'Soğuk';

                var row = '<div class="recent-lead-item">' +
                    '<div class="rl-left">' +
                        '<div class="rl-avatar">' + avatar + '</div>' +
                        '<div class="rl-info">' +
                            '<h5>' + (lead.fullName || '-') + '</h5>' +
                            '<p>' + (lead.company || lead.email || '-') + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="rl-badges">' +
                        '<span class="rl-badge ' + tClass + '">' + tempText + '</span>' +
                        '<span class="rl-badge ' + sClass + '">' + statusText + '</span>' +
                    '</div>' +
                '</div>';
                rl.append(row);
            });
        }
    }).fail(function() {
        showError('Dashboard verileri yüklenemedi.');
    });

    $.get(apiUrl('/api/dashboard/charts'), function(data) {
        if (window.sourceChart && window.scoreChart) {
            window.sourceChart.data.labels = data.sourceData.map(x => x.label);
            window.sourceChart.data.datasets[0].data = data.sourceData.map(x => x.value);
            window.sourceChart.update();
            window.scoreChart.data.labels = data.scoreBuckets;
            window.scoreChart.data.datasets[0].data = data.scoreValues;
            window.scoreChart.update();
        }
    }).fail(function() {
        showError('Grafik verileri yüklenemedi.');
    });

    $.get(apiUrl('/api/tasks'), function(tasks) {
        if (Array.isArray(tasks)) {
            var openTasks = tasks.filter(function(task) {
                return !task.isCompleted;
            }).length;
            $('#kpiOpenTasks').text(openTasks);
            if(window.updateNotifications) window.updateNotifications(openTasks);
        }
    }).fail(function() {
        $('#kpiOpenTasks').text('0');
        if(window.updateNotifications) window.updateNotifications(0);
    });
}

function initNotifications() {
    $.get(apiUrl('/api/tasks'), function(tasks) {
        if (Array.isArray(tasks)) {
            var openTasks = tasks.filter(function(task) {
                return !task.isCompleted;
            }).length;
            $('.notification-icon .badge').toggle(openTasks > 0);
            $('#notificationCountText').text(openTasks);
        }
    }).fail(function() {
        $('.notification-icon .badge').hide();
        $('#notificationCountText').text('0');
    });
}
window.updateNotifications = function(count) {
    $('.notification-icon .badge').toggle(count > 0);
    $('#notificationCountText').text(count);
};

function loadLeadDetailPage() {
    if ($('#leadDetailPage').length === 0) return;

    var leadId = getUrlParameter('id');
    if (!leadId) {
        showError('Lead bilgisi bulunamadı.');
        return;
    }

    $.get(apiUrl('/api/leads/' + leadId), function(lead) {
        window.currentLeadId = leadId;
        $('#leadDetailName').text(lead.fullName || 'Lead Detayı');
        $('#leadDetailTemperatureLabel').text(lead.temperature || '-');
        $('#leadDetailStatusLabel').text(lead.status || '-');
        $('#leadAvatarLetter').text((lead.fullName || 'L').charAt(0).toUpperCase());
        $('#detailEmail').text(lead.email || '-');
        $('#detailPhone').text(lead.phone || '-');
        $('#detailCity').text(lead.city || '-');
        $('#detailSource').text(lead.source || '-');
        
        // Setup specialized links with proper data
        if(lead.phone) {
            var purePhone = lead.phone.replace(/[^0-9]/g, '');
            if(purePhone.length === 10) purePhone = '90' + purePhone; // naive TR approach
            else if(purePhone.length === 11 && purePhone.startsWith('0')) purePhone = '9' + purePhone;
            $('#waLink').attr('href', 'https://wa.me/' + purePhone).show();
            $('#detailPhone').text(lead.phone);
        } else {
            $('#waLink').hide();
            $('#detailPhone').text('-');
        }

        if(lead.email) {
            $('#mailLink').attr('href', 'mailto:' + lead.email).show();
            $('#detailEmail').text(lead.email);
        } else {
            $('#mailLink').hide();
            $('#detailEmail').text('-');
        }
        
        var dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('tr-TR') : '-';
        $('#detailCreatedAt').text(dateStr);
        $('#detailCompany').text(lead.company || '-');
        $('#detailPosition').text(lead.position || '-');
        $('#detailIndustry').text(lead.industry || '-');
        $('#leadScoreValue').text(lead.score || 0);
        $('#leadScoreBehavioral').text(0);
        $('#leadScoreDemographic').text(lead.score || 0);

        loadLeadActivity(lead);
        loadLeadTasks(lead);
    }).fail(function() {
        showError('Lead detayı yüklenemedi.');
    });
}

function loadLeadActivity(lead) {
    if ($('#leadActivityList').length === 0) return;

    $.get(apiUrl('/api/leads/' + lead.id + '/activities'), function(data) {
        var list = $('#leadActivityList');
        list.empty();
        
        if (!Array.isArray(data) || data.length === 0) {
            list.html('<div style="color:#6b7280; font-size:13px; text-align:center; padding:20px;">Henüz aktivite bulunmuyor.</div>');
            return;
        }

        data.forEach(function(activity) {
            var icon = 'edit-2';
            if(activity.type === 'WhatsApp') icon = 'message-circle';
            else if(activity.type === 'E-posta') icon = 'mail';
            else if(activity.type === 'Telefon') icon = 'phone-call';
            else if(activity.type === 'SMS') icon = 'message-square';
            else if(activity.type === 'Görev') icon = 'check-square';
            else if(activity.type === 'Sosyal Medya') icon = 'share-2';
            else if(activity.type === 'Toplantı') icon = 'users';

            var timeFormatted = new Date(activity.createdAt).toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            var item = '<div class="activity-item">' +
                '<div class="activity-icon"><i data-lucide="' + icon + '"></i></div>' +
                '<div class="activity-content">' +
                    '<div class="activity-title">' + (activity.type || 'Aktivite') + '</div>' +
                    '<div class="activity-text">' + (activity.description || '') + '</div>' +
                    '<div class="activity-meta"><span>' + timeFormatted + '</span><span>' + activity.type + '</span></div>' +
                '</div>' +
            '</div>';
            list.append(item);
        });
        if(window.lucide) lucide.createIcons();
    }).fail(function() {
        $('#leadActivityList').html('<div style="color:red; font-size:13px;">Aktiviteler yüklenemedi.</div>');
    });
}

function addLeadActivity() {
    var text = prompt('Yeni aktivite notunu girin:');
    if (!text) return;

    var now = new Date();
    var formatted = now.toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    var item = '<div class="activity-item">' +
        '<div class="activity-icon"><i data-lucide="plus"></i></div>' +
        '<div class="activity-content">' +
            '<div class="activity-title">Yeni aktivite</div>' +
            '<div class="activity-text">' + text + '</div>' +
            '<div class="activity-meta"><span>' + formatted + '</span><span>Not</span></div>' +
        '</div>' +
    '</div>';
    $('#leadActivityList').prepend(item);
}

function loadLeadTasks(lead) {
    if ($('#leadTasksList').length === 0) return;

    $.get(apiUrl('/api/tasks'), function(data) {
        if (!Array.isArray(data)) data = [];
        var related = data.filter(function(task) {
            return task.relatedLead && lead.fullName && task.relatedLead.toLowerCase().includes(lead.fullName.toLowerCase());
        });

        var list = $('#leadTasksList');
        list.empty();
        if (related.length === 0) {
            list.html('<div class="empty-state">Bu lead için görev bulunamadı.</div>');
            return;
        }

        related.forEach(function(task) {
            var status = task.isCompleted ? 'Tamamlandı' : 'Bekliyor';
            var badgeClass = task.isCompleted ? 'badge-light-green' : 'badge-light-purple';
            var item = '<div class="task-row"><div><strong>' + task.title + '</strong><p>' + (task.description || '') + '</p></div><span class="badge ' + badgeClass + '">' + status + '</span></div>';
            list.append(item);
        });
    }).fail(function() {
        $('#leadTasksList').html('<div class="empty-state">Görevler yüklenemedi.</div>');
    });
}

function goBackToLeads() {
    window.location.href = 'leadler.html';
}

function openNotifications(event) {
    if (event) event.stopPropagation();
    var panel = $('#notificationPanel');
    if (!panel.length) return;

    panel.toggleClass('visible');
    if (panel.hasClass('loaded')) return;

    $.get(apiUrl('/api/tasks'), function(tasks) {
        var list = $('#notificationList');
        var countText = $('#notificationCountText');
        var badgeDot = $('.notification-icon .badge');
        if (!Array.isArray(tasks)) tasks = [];

        var openTasks = tasks.filter(function(task) {
            return !task.isCompleted;
        });

        badgeDot.toggle(openTasks.length > 0);
        countText.text(openTasks.length);

        if (openTasks.length === 0) {
            list.html('<div class="notification-empty">Açık görev yok. Tüm görevleri görmek için <a href="gorevler.html?filter=open">Görevler</a> sayfasına gidin.</div>');
        } else {
            var items = openTasks.slice(0, 5).map(function(task) {
                return '<a href="gorevler.html?filter=open" class="notification-item">' +
                    '<div class="notification-item-icon"><i data-lucide="check-circle"></i></div>' +
                    '<div class="notification-item-content">' +
                        '<div class="notification-item-title">' + (task.title || 'Görev') + '</div>' +
                        '<div class="notification-item-meta">' + (task.assignedTo || 'Atanmamış') + ' • ' + (task.dueDate ? formatDate(task.dueDate) : 'Bitiş tarihi yok') + '</div>' +
                    '</div>' +
                '</a>';
            }).join('');
            list.html(items);
        }

        panel.addClass('loaded');
    }).fail(function() {
        $('#notificationList').html('<div class="notification-empty">Bildirimler yüklenemedi. Lütfen daha sonra tekrar deneyin.</div>');
        $('#notificationCountText').text('0');
        $('.notification-icon .badge').hide();
    });
}

$(document).on('click', function(event) {
    if (!$(event.target).closest('.notification-icon, #notificationPanel').length) {
        $('#notificationPanel').removeClass('visible');
    }
});

function loadLeadsPage() {
    if ($('#leadsTableBody').length === 0) return;

    var currentPage = 1;
    var pageSize = 10;

    function renderLeadsTable(data, totalRecords) {
        var tbody = $('#leadsTableBody');
        tbody.empty();
        
        $('#totalLeadsText').text(totalRecords + ' lead kayıtlı');

        if (data.length === 0) {
            tbody.html('<tr><td colspan="6" style="text-align:center; padding:40px; color:#6b7280;">Kayıt bulunamadı.</td></tr>');
            $('.pagination-container').remove();
            return;
        }

        data.forEach(function(lead) {
            var statusClass = 'badge-status'; 
            var statusText = lead.status || 'Skorlandı';
            
            var temperatureBadge = '';
            if (lead.temperature) {
                var tempClass = lead.temperature === 'Sıcak' ? 'badge-hot' : 
                                lead.temperature === 'Ilık' ? 'badge-warm' : 'badge-cold';
                temperatureBadge = '<span class="badge-rounded ' + tempClass + '">' + lead.temperature + '</span>';
            }

            var avatarChar = (lead.fullName ? lead.fullName.charAt(0) : '-').toUpperCase();
            
            var tr = '<tr ondblclick="window.location.href=\'lead-detail.html?id=' + lead.id + '\'" style="cursor: pointer;">' +
                '<td>' +
                    '<div class="lead-info-col">' +
                        '<div class="lead-avatar-circle">' + avatarChar + '</div>' +
                        '<div class="lead-name-box">' +
                            '<h5>' + (lead.fullName || '-') + '</h5>' +
                            '<p>' + (lead.email || '-') + '</p>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td>' +
                    '<div class="company-info">' +
                        '<h5>' + (lead.company || '-') + '</h5>' +
                        '<p>' + (lead.industry || 'Bilinmiyor') + '</p>' +
                    '</div>' +
                '</td>' +
                '<td><span class="source-text">' + (lead.source || '-') + '</span></td>' +
                '<td><span class="score-text">' + (lead.score || 0) + '</span></td>' +
                '<td>' + temperatureBadge + '</td>' +
                '<td><span class="badge-rounded ' + statusClass + '">' + statusText + '</span></td>' +
            '</tr>';
            tbody.append(tr);
        });

        renderPagination(totalRecords);
    }

    function renderPagination(totalRecords) {
        $('.pagination-container').remove();
        
        var totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
        var startItem = totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
        var endItem = Math.min(currentPage * pageSize, totalRecords);

        var paginationHtml = '<div class="pagination-container" style="display:flex; justify-content:space-between; align-items:center; padding: 16px 20px; border-top: 1px solid #e5e7eb; background: #fff;">' +
            '<div style="color: #6b7280; font-size: 14px;">' + totalRecords + ' kayıttan ' + startItem + ' - ' + endItem + ' arası gösteriliyor</div>' +
            '<div style="display:flex; gap:8px;">' +
                '<button class="btn btn-outline" style="padding: 6px 12px;" onclick="changeLeadPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '>Önceki</button>' +
                '<div style="padding: 6px 12px; font-weight:500; color:#374151;">' + currentPage + ' / ' + totalPages + '</div>' +
                '<button class="btn btn-outline" style="padding: 6px 12px;" onclick="changeLeadPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>Sonraki</button>' +
            '</div>' +
        '</div>';

        $('#leadsTable').parent().append(paginationHtml);
    }

    window.changeLeadPage = function(newPage) {
        currentPage = newPage;
        fetchLeads();
    };

    function fetchLeads() {
        var params = { page: currentPage, pageSize: pageSize };
        if ($('#filterSource').length && $('#filterSource').val()) params.source = $('#filterSource').val();
        if ($('#filterStatus').length && $('#filterStatus').val()) params.status = $('#filterStatus').val();
        
        // Use the correct filter dropdown id for Temperature
        if ($('#filterTemperature').length && $('#filterTemperature').val()) {
            params.temperature = $('#filterTemperature').val();
        } else if (window.leadUrlTemperatureFilter) {
            params.temperature = window.leadUrlTemperatureFilter;
        }

        var searchVal = $('#globalSearch').val();
        if(searchVal) params.search = searchVal.trim();

        $.get(apiUrl('/api/leads'), params, function(response) {
            var data = response.data || response;
            if (!Array.isArray(data)) data = [];
            var totalRecords = response.totalRecords || data.length;
            renderLeadsTable(data, totalRecords);
        }).fail(function() {
            showError('Lead verileri yüklenemedi.');
        });
    }

    $('#filterSource, #filterStatus, #filterTemperature').off('change').on('change', function() {
        currentPage = 1;
        fetchLeads();
    });

    $('#globalSearch').off('input').on('input', function() {
        currentPage = 1;
        fetchLeads();
    });

    var urlFilter = getUrlParameter('filter');
    window.leadUrlTemperatureFilter = '';
    if(urlFilter) {
        if(urlFilter === 'hot') window.leadUrlTemperatureFilter = 'Sıcak';
        else if(urlFilter === 'warm') window.leadUrlTemperatureFilter = 'Ilık';
        else if(urlFilter === 'cold') window.leadUrlTemperatureFilter = 'Soğuk';
    }

    fetchLeads();
}

function editLead(leadId) {
    $.get(apiUrl('/api/leads/' + leadId), function(lead) {
        $('#leadFullName').val(lead.fullName || '');
        $('#leadEmail').val(lead.email || '');
        $('#leadPhone').val(lead.phone || '');
        $('#leadCompany').val(lead.company || '');
        $('#leadPosition').val(lead.position || '');
        $('#leadIndustry').val(lead.industry || '');
        $('#leadCity').val(lead.city || '');
        $('#leadSource').val(lead.source || '');
        $('#leadCompanySize').val(lead.companySize || '');
        $('#leadBudget').val(lead.budget || '');
        $('#leadCustomerType').val(lead.customerType || '');
        $('#leadScore').val(lead.score || 0);
        $('#leadTemperature').val(lead.temperature || '');
        $('#leadStatus').val(lead.status || '');
        $('#leadNotes').val(lead.notes || '');
        
        $('#newLeadModal .modal-header h3').text('Lead Düzenle');
        
        $('#newLeadForm').off('submit').on('submit', function(event) {
            event.preventDefault();
            var payload = {
                id: leadId,
                fullName: $('#leadFullName').val(),
                email: $('#leadEmail').val(),
                phone: $('#leadPhone').val(),
                company: $('#leadCompany').val(),
                position: $('#leadPosition').val(),
                industry: $('#leadIndustry').val(),
                city: $('#leadCity').val(),
                source: $('#leadSource').val(),
                companySize: $('#leadCompanySize').val(),
                budget: $('#leadBudget').val(),
                customerType: $('#leadCustomerType').val(),
                notes: $('#leadNotes').val(),
                score: parseInt($('#leadScore').val() || '0', 10),
                temperature: $('#leadTemperature').val(),
                status: $('#leadStatus').val()
            };

            $.ajax({
                url: apiUrl('/api/leads/' + leadId),
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                success: function() {
                    $('#newLeadModal').hide();
                    loadLeadsPage();
                },
                error: function() {
                    showError('Lead güncellenemedi.');
                }
            });
        });
        
        $('#newLeadModal').show();
    }).fail(function() {
        showError('Lead verisi yüklenemedi.');
    });
}

function loadTasksPage() {
    if ($('#taskForm').length === 0) return;

    var taskFilter = getUrlParameter('filter');
    var openOnly = taskFilter === 'open';
    if (openOnly) {
        $('.page-title p').text('Sadece açık görevler görüntüleniyor.');
    }

    function fetchTasks() {
        $.get(apiUrl('/api/tasks'), function(data) {
            var wrapper = $('.task-list');
            wrapper.empty();
            if (!Array.isArray(data)) data = [];
            if (openOnly) {
                data = data.filter(function(task) {
                    return !task.isCompleted;
                });
            }

            if (data.length === 0) {
                wrapper.html('<div class="notification-empty">Görev bulunamadı. Lütfen farklı filtre deneyin veya yeni görev ekleyin.</div>');
                return;
            }

            data.forEach(function(task) {
                var completedClass = task.isCompleted ? 'completed' : '';
                var checked = task.isCompleted ? 'checked' : '';
                var row = '<div class="task-item ' + completedClass + '">' +
                    '<label class="task-checkbox"><input type="checkbox" ' + checked + ' disabled><div class="checker"><i data-lucide="check"></i></div></label>' +
                    '<div class="task-content"><div class="task-title">' + task.title + '</div>' +
                    '<div class="task-desc">' + (task.description || '&nbsp;') + '</div>' +
                    '<div class="task-badges"><span class="badge badge-priority-high">' + task.priority + '</span>' +
                    '<span class="badge badge-assignee"><i data-lucide="user"></i> ' + task.assignedTo + '</span>' +
                    '<span class="badge badge-lead"><i data-lucide="link"></i> ' + (task.relatedLead || 'İlişkilendirilmemiş') + '</span></div></div></div>';
                wrapper.append(row);
            });
        }).fail(function() {
            showError('Görevler yüklenemedi.');
        });
    }

    $('#taskForm').on('submit', function(event) {
        event.preventDefault();
        var payload = {
            title: $('#taskTitle').val(),
            description: $('#taskDescription').val(),
            assignedTo: $('#taskAssignedTo').val(),
            priority: $('#taskPriority').val(),
            dueDate: $('#taskDueDate').val() || null,
            category: $('#taskCategory').val(),
            relatedLead: $('#taskRelatedLead').val()
        };

        $.ajax({
            url: apiUrl('/api/tasks'),
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function() {
                $('#taskModal').hide();
                fetchTasks();
            },
            error: function() {
                showError('Görev kaydedilemedi.');
            }
        });
    });

    fetchTasks();
}

function loadPipelinePage() {
    if ($('.kanban-board').length === 0) return;

    $.get(apiUrl('/api/pipeline'), function(data) {
        $('.kanban-column').each(function(index) {
            var stage = $(this).find('.kanban-header span:first-child').text().trim();
            var body = $(this).find('.kanban-body');
            body.empty();
            var stageData = data.find(x => x.stage === stage);
            if (!stageData) {
                $(this).find('.kanban-count').text('0');
                return;
            }
            $(this).find('.kanban-count').text(stageData.cards.length);
            stageData.cards.forEach(function(card) {
                var actions = '';
                if (stage !== 'Kazanıldı' && stage !== 'Kaybedildi') {
                    actions = '<div class="card-actions">' +
                        '<button class="btn-reject" onclick="moveToLost(this)" title="Kaybedildi"><i data-lucide="x"></i></button>' +
                        '<button class="btn-advance" onclick="moveNext(this)"><i data-lucide="arrow-right"></i> İlerlet</button>' +
                        '</div>';
                } else {
                    actions = '<span style="color:' + (stage === 'Kazanıldı' ? '#10B981' : '#EF4444') + '; font-size:12px; font-weight:bold;">' +
                        (stage === 'Kazanıldı' ? '<i data-lucide="check-circle"></i> Satış Kapandı' : '<i data-lucide="x-circle"></i> Satış Kaybedildi') +
                        '</span>';
                }

                var html = '<div class="kanban-card">' +
                    '<div class="card-title">' + card.fullName + '</div>' +
                    '<div class="card-company">' + (card.company || '') + '</div>' +
                    '<div class="card-meta"><span class="card-score score-low"><i data-lucide="zap"></i> Skor: ' + card.score + '</span>' + actions + '</div>' +
                    '</div>';
                body.append(html);
            });
        });
    }).fail(function() {
        showError('Pipeline verileri yüklenemedi.');
    });
}

function loadScoringPage() {
    if ($('#scoringTable').length === 0) return;

    $.get(apiUrl('/api/leads'), function(response) {
        var data = response.data || response;
        if (!Array.isArray(data)) data = [];
        var tbody = $('#scoringTable tbody');
        tbody.empty();
        data.forEach(function(lead) {
            var demographic = Math.round((lead.score || 0) * 0.45);
            var behavioral = Math.round((lead.score || 0) * 0.55);
            var row = '<tr>' +
                '<td><div class="table-avatar-wrapper"><div><strong>' + lead.fullName + '</strong><span class="table-subtext">' + (lead.company || '-') + '</span></div></div></td>' +
                '<td><div class="score-progress-wrapper"><div class="score-progress-bg"><div class="score-progress-fill" style="width: ' + demographic + '%;"></div></div><div class="score-value-text">' + demographic + '</div></div></td>' +
                '<td><div class="score-progress-wrapper"><div class="score-progress-bg"><div class="score-progress-fill" style="width: ' + behavioral + '%;"></div></div><div class="score-value-text">' + behavioral + '</div></div></td>' +
                '<td><div class="total-score-wrapper">' + (lead.score || 0) + '<span>/100</span></div></td>' +
                '<td>' + badgeForTemperature(lead.temperature) + '</td>' +
                '<td style="text-align: right;"><button class="btn-score-action" data-id="' + lead.id + '" style="float: right;"><i data-lucide="zap"></i> Skorla</button></td>' +
                '</tr>';
            tbody.append(row);
        });

        $('#scoringTable').DataTable({
            pageLength: 10,
            lengthChange: false,
            bFilter: false,
            language: {
                info: '_TOTAL_ kayıttan _START_ - _END_ arası gösteriliyor',
                paginate: { next: 'İleri', previous: 'Geri' }
            }
        });
    }).fail(function() {
        showError('Skorlama verileri yüklenemedi.');
    });
}

function loadNurturingPage() {
    if ($('.nurturing-list').length === 0) return;

    $.get(apiUrl('/api/leads'), function(response) {
        var data = response.data || response;
        if (!Array.isArray(data)) data = [];
        var list = $('.nurturing-list');
        list.empty();
        var nurturing = data.filter(function(lead) {
            return lead.status === 'Nurturing' || lead.temperature === 'Ilık' || lead.temperature === 'Soğuk';
        }).slice(0, 6);

        nurturing.forEach(function(lead) {
            var badge = lead.temperature === 'Ilık' ? 'badge-warm' : lead.temperature === 'Soğuk' ? 'badge-cold' : 'badge-warm';
            var score = lead.score || 0;
            var html = '<div class="nurturing-item"><div class="nurturing-left"><div class="nurturing-avatar">' + (lead.fullName ? lead.fullName.charAt(0).toUpperCase() : '-') + '</div><div class="nurturing-info"><strong>' + lead.fullName + '</strong><span>' + (lead.company || lead.email) + '</span></div></div><div class="nurturing-right"><span class="segment-badge">' + (lead.source || 'Segment Yok') + '</span><span class="badge ' + badge + '">' + (lead.temperature || 'Bilinmiyor') + '</span><span class="nurturing-score">' + score + '</span></div></div>';
            list.append(html);
        });
    }).fail(function() {
        showError('Nurturing verileri yüklenemedi.');
    });
}

$(function() {
    initNotifications();
    loadLoginPage();
    loadDashboardPage();
    loadLeadsPage();
    loadTasksPage();
    loadPipelinePage();
    loadScoringPage();
    loadNurturingPage();
});

// Create Lucide icons globally whenever ajax completes
$(document).ajaxComplete(function() {
    if(window.lucide) {
        lucide.createIcons();
    }
});

window.editLead = function(id) {
    $.get(apiUrl('/api/leads/' + id), function(lead) {
        $('#leadFullName').val(lead.fullName || '');
        $('#leadEmail').val(lead.email || '');
        $('#leadCompany').val(lead.company || '');
        $('#leadPhone').val(lead.phone || '');
        $('#leadScore').val(lead.score || 0);

        $('#leadPosition').val(lead.position || '');
        $('#leadIndustry').val(lead.industry || '');
        $('#leadCity').val(lead.city || '');
        $('#leadSource').val(lead.source || '');
        $('#leadCompanySize').val(lead.companySize || '');
        $('#leadBudget').val(lead.budget || '');
        $('#leadCustomerType').val(lead.customerType || '');
        $('#leadNotes').val(lead.notes || '');

        $('#newLeadForm').off('submit').on('submit', function(e) {
            e.preventDefault();
            var updatedLead = {
                id: lead.id,
                fullName: $('#leadFullName').val(),
                email: $('#leadEmail').val(),
                company: $('#leadCompany').val(),
                phone: $('#leadPhone').val(),
                score: $('#leadScore').val() || 0,
                position: $('#leadPosition').val() || null,
                industry: $('#leadIndustry').val() || null,
                city: $('#leadCity').val() || null,
                source: $('#leadSource').val() || 'Web Formu',
                companySize: $('#leadCompanySize').val() || null,
                budget: $('#leadBudget').val() || null,
                customerType: $('#leadCustomerType').val() || null,
                notes: $('#leadNotes').val() || null,
                status: lead.status || 'Yeni',
                temperature: lead.temperature || 'Soğuk'
            };
            $.ajax({
                url: apiUrl('/api/leads/' + lead.id),
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(updatedLead),
                success: function() {
                    $('#newLeadModal').hide();
                    location.reload();
                }
            });
        });
        $('#newLeadModal').css('display', 'flex');
    });
};

window.currentActivityType = 'Not';

window.selectActivityTab = function(btn, type) {
    $('.act-tab').removeClass('active');
    $(btn).addClass('active');
    window.currentActivityType = type;
    var placeholders = {
        'Not': 'Bir not bırakın...',
        'E-posta': 'E-posta detayları veya taslak...',
        'Telefon': 'Telefon görüşmesi detayları...',
        'WhatsApp': 'WhatsApp mesajlaşma özeti...',
        'SMS': 'Gönderilen SMS içeriği...',
        'Görev': 'Görev detayları...',
        'Sosyal Medya': 'Sosyal medya etkileşimi detayı...',
        'Toplantı': 'Toplantı notları ve kararlar...'
    };
    $('#inlineActivityDesc').attr('placeholder', placeholders[type] || 'Aktivite içeriğini buraya yazın...');
};

window.saveInlineActivity = function() {
    var desc = $('#inlineActivityDesc').val();
    if(!desc.trim()) { alert('Lütfen ' + window.currentActivityType.toLowerCase() + ' içeriği yazın'); return; }
    
    var payload = {
        type: window.currentActivityType,
        description: desc
    };

    $.ajax({
        url: apiUrl('/api/leads/' + window.currentLeadId + '/activities'),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function() {
            $('#inlineActivityDesc').val('');
            if(window.currentLeadId) {
                loadLeadActivity({id: window.currentLeadId});
            }
        },
        error: function() {
            showError('Aktivite kaydedilemedi.');
        }
    });
};
