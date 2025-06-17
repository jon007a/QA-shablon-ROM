void MainWindow::setupDatabaseConnection()
{
    QString connectionName = generateConnectionName();
    db = QSqlDatabase::addDatabase("QPSQL", connectionName);
    db.setHostName("X");
    db.setDatabaseName("X");
    db.setUserName("X");
    db.setPassword("X");
    db.setPort(5432);

    if (!db.open()) {
        qDebug() << "Нет подключения к бд:" << db.lastError().text();
        statusBar()->showMessage("Нет подключения к бд", 2000);
    } else {
        qDebug() << "есть подключения к бд!";
        statusBar()->showMessage("подключения к бд успешно", 2000);
    }
}

void MainWindow::applySettings(QString connectionType, int comPort, int baudRate, 
int dataBits, int stopBits, int parity, QString ipAddress, int port)
{
    if (!userSelected) {
        QMessageBox::warning
        (this, "Warning", "Выберите пользователя перед подключением");
        return;
    }

    if (modbusDevice) {
        modbusDevice->disconnectDevice();
        delete modbusDevice;
        modbusDevice = nullptr;
    }

    if (connectionType == "RTU") {
        QModbusRtuSerialClient *rtuClient = new QModbusRtuSerialClient(this);
        rtuClient->setConnectionParameter (QModbusDevice::SerialPortNameParameter, 
        QString("COM%1").arg(comPort));
        rtuClient->setConnectionParameter(QModbusDevice::SerialBaudRateParameter, baudRate);
        rtuClient->setConnectionParameter(QModbusDevice::SerialDataBitsParameter, dataBits);
        rtuClient->setConnectionParameter(QModbusDevice::SerialStopBitsParameter, stopBits);
        rtuClient->setConnectionParameter(QModbusDevice::SerialParityParameter, parity);
        rtuClient->setTimeout(1000);
        rtuClient->setNumberOfRetries(3);

        if (rtuClient->connectDevice()) {
            qDebug() << "Подключен к RTU девайсу";
            onSlaveConnected();

            QPixmap greenIcon("icon11.svg");
            statusIndicator->setPixmap(QPixmap("icon11.svg"));
            statusIndicator->setPixmap(greenIcon.scaled
            (32, 32, Qt::KeepAspectRatio, Qt::SmoothTransformation));
            statusBar()->showMessage("Подключен к RTU девайсу", 2000);
        } else {
            qDebug() << "Не подключен к RTU девайсу";
            statusBar()->showMessage("Не подключен к RTU девайсу", 5000);
        }

        modbusDevice = rtuClient;

    } else if (connectionType == "TCP") {
        QModbusTcpClient *tcpClient = new QModbusTcpClient(this);
        tcpClient->setConnectionParameter(QModbusDevice::NetworkAddressParameter, ipAddress);
        tcpClient->setConnectionParameter(QModbusDevice::NetworkPortParameter, port);

        tcpClient->setTimeout(10000);

        if (!tcpClient->connectDevice()) {
            qDebug() << "Ошибка подключения к TCP устройству.";
            statusBar()->showMessage("Ошибка подключения к TCP устройству", 5000);
        } else {
            qDebug() << "Успешное подключение к TCP устройству.";

            QPixmap greenIcon("icon11.svg");
            statusIndicator->setPixmap(greenIcon);
            statusIndicator->setPixmap(greenIcon.scaled
            (32, 32, Qt::KeepAspectRatio, Qt::SmoothTransformation));
            statusBar()->showMessage("Успешное подключение к TCP устройству", 2000);
        }

        modbusDevice = tcpClient;
    }

    // Считывание  данных
    if (modbusDevice) {

        QModbusDataUnit
        readRequest(QModbusDataUnit::HoldingRegisters, 0, 6);  // Чтение регистра с адреса 0
        if (auto *reply = modbusDevice->
        sendReadRequest(readRequest, 1)) {
        connect(reply, &QModbusReply::finished, 
        this, &MainWindow::onModbusReadReady);
        }
    }
}

// Слот для обработки данных с Modbus
void MainWindow::onModbusReadReady()
{
    auto *reply = qobject_cast<QModbusReply *>(sender());
    if (!reply) return;

    if (reply->error() == QModbusDevice::NoError) {
        const QModbusDataUnit unit = reply->result();

        // Получаем значения из всех регистров
        quint16 controlWord = unit.value(REG_CONTROL);  // Регистр 0
        quint16 statusWord = unit.value(REG_STATUS);    // Регистр 1
        quint16 speedRaw = unit.value(REG_SPEED);       // Регистр 2
        quint16 currentRaw = unit.value(REG_CURRENT);   // Регистр 3
        quint16 voltageRaw = unit.value(REG_VOLTAGE);   // Регистр 4
        quint16 tempRaw = unit.value(REG_TEMP);         // Регистр 5

        // Обновление статуса привода
        updateDriveStatus(statusWord);

        // Преобразование  значений
        double speed = (speedRaw / MAX_SPEED_VALUE) * 3000.0;
        double current = currentRaw * CURRENT_SCALE;
        double voltage = voltageRaw;
        double temperature = tempRaw;


        if (ui->progressBar1) {
            ui->progressBar1->setValue(current);
        }
        if (ui->progressBar22) {
            ui->progressBar22->setValue(voltage);
        }
        if (ui->progressBar4) {
            ui->progressBar4->setValue(temperature);
        }

        // Обновление QML интерфейса
        if (qmlWidget) {
            QQuickItem *rootObject = qmlWidget->rootObject();
            if (rootObject) {
                rootObject->setProperty("dialValue", speed);
            }
        }

        // Сохраняем данные в БД
        insertDataToUserTable(currentUser,
        controlWord,
        statusWord,
        static_cast<int>(speed),
        static_cast<int>(current),
        static_cast<int>(voltage),
        static_cast<int>(temperature));
        // Отправляем сигналы для графиков
        emit motorSpeedUpdated(speed);
        emit progressbars(current);
        emit progressbars2(voltage);
        emit progressbars4(temperature);

        successPackets++;
    } else {
        errorPackets++;
        qDebug() << "Modbus error:" << reply->errorString();
    }

    if (modbusDevice) {
        QString type = (dynamic_cast<QModbusRtuSerialClient*>
        (modbusDevice)) ? "RTU" : "TCP";
        QString address = type == "RTU" ?
         modbusDevice->
         connectionParameter(QModbusDevice::SerialPortNameParameter).toString() :
         modbusDevice->
         connectionParameter(QModbusDevice::NetworkAddressParameter).toString();
        updateConnectionInfo(type, address, successPackets, errorPackets);
    }

    reply->deleteLater();
}

void MainWindow::setCurrentUser(const QString &username)
{
    currentUser = username;
    userSelected = true;
    // Проверяем, является ли пользователь администратором
    QSqlQuery query(db);
    query.prepare("SELECT role FROM users WHERE username = :username");
    query.bindValue(":username", username);

    if (query.exec() && query.next()) {

     isAdminUser = (query.value(0).toString().toLower() == "admin");

    }

    // Создаем таблицу для пользователя
    if (createUserTable(username)) {
        enableControls();
    } else {
        QMessageBox::critical
        (this, "Error", "Не удалось создать таблицу для пользователя");
        userSelected = false;
    }
}

bool MainWindow::createUserTable(const QString &username)
{
    if (username.isEmpty()) {
        qDebug() << 
        "Невозможно создать таблицу для пустого имени пользователя";
        return false;
    }

    QSqlQuery query(db);
    QString tableName = "motor_data_" + username.toLower();

    // Обновленная структура с новыми полями
    QString createTableQuery = QString(
    "CREATE TABLE IF NOT EXISTS \"%1\" ("
    "id SERIAL PRIMARY KEY, "
     "control_word INTEGER, "     // Регистр 0 - управление
     "status_word INTEGER, "      // Регистр 1 - статус
     "speed INTEGER, "            // Регистр 2 - обороты
     "amperage INTEGER, "         // Регистр 3 - ток (progress1)
     "voltage INTEGER, "          // Регистр 4 - напряжение (progress2)
     "temperature INTEGER, "      // Регистр 5 - температура
     "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
     ")").arg(tableName);

    if (!query.exec(createTableQuery)) {
        qDebug() << "Ошибка создания таблицы для пользователя" << username
        << ":" << query.lastError().text()
        << "\nQuery was:" << createTableQuery;
        return false;
    }

    qDebug() << "Таблица для пользователя успешно создана" << username;
    return true;
}

void MainWindow::insertDataToUserTable(const QString &username,
    quint16 controlWord,    // Регистр 0
    quint16 statusWord,     // Регистр 1
    int motorSpeed,         // Регистр 2
    int amperage,           // Регистр 3
    int voltage,            // Регистр 4
    int temperature)        // Регистр 5
{
    QString tableName = "motor_data_" + username.toLower();
    QSqlQuery query(db);
    QString queryStr = QString(
     "INSERT INTO \"%1\" "
     "(control_word, status_word, speed, amperage, voltage, temperature) "
     "VALUES ($1, $2, $3, $4, $5, $6)"
      ).arg(tableName);
    query.prepare(queryStr);
    query.bindValue(0, controlWord);
    query.bindValue(1, statusWord);
    query.bindValue(2, motorSpeed);
    query.bindValue(3, amperage);
    query.bindValue(4, voltage);
    query.bindValue(5, temperature);
    if (!query.exec()) {
        qDebug() << "Ошибка базы данных при вставке данных для пользователя" << username
                 << ":" << query.lastError().text()
    } else {
     qDebug() << "Данные для пользователя успешно вставлены" << username
    << ": control=" << controlWord
    << ", status=" << statusWord
    << ", speed=" << motorSpeed
    << ", amperage=" << amperage
    << ", voltage=" << voltage
    << ", temperature=" << temperature;
    }
}
