#!/bin/bash
# Скрипт вызывает парсер JSON данных с параметром номера. Парсер в свою очередь открывает соответствующий файл JSON и пишет в соответствующий файл в CSV

 COUNTER=1
 while [  $COUNTER -lt 2 ]; do
     node parse.js -number $COUNTER;
     let COUNTER=COUNTER+1
     echo "$COUNTER-----------------------------------------------------------";
 done
