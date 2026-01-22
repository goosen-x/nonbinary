#!/usr/bin/env python3
"""
POST-запрос к JSONPlaceholder API для создания нового todo элемента.
Использует библиотеку requests с современными best practices.
"""

import requests
import json
from typing import Dict, Any


def create_todo(url: str, todo_data: Dict[str, Any]) -> requests.Response:
    """
    Отправляет POST-запрос для создания нового todo элемента.

    Args:
        url: URL endpoint API
        todo_data: Словарь с данными todo

    Returns:
        Response объект с ответом от сервера
    """
    try:
        # Используем параметр json= для автоматической сериализации и установки заголовков
        # Это best practice согласно документации requests 2025
        response = requests.post(
            url,
            json=todo_data,
            timeout=10  # Всегда указываем timeout для предотвращения зависания
        )

        # Проверяем статус ответа
        response.raise_for_status()

        return response

    except requests.exceptions.Timeout:
        print("Ошибка: Превышено время ожидания ответа от сервера")
        raise
    except requests.exceptions.ConnectionError:
        print("Ошибка: Не удалось подключиться к серверу")
        raise
    except requests.exceptions.HTTPError as e:
        print(f"HTTP ошибка: {e}")
        raise
    except requests.exceptions.RequestException as e:
        print(f"Общая ошибка запроса: {e}")
        raise


def main():
    # Endpoint для создания todo
    api_url = "https://jsonplaceholder.typicode.com/todos"

    # Данные для отправки
    todo_data = {
        "userId": 1,
        "title": "Написать код на Python",
        "completed": False
    }

    print("=" * 70)
    print("POST-запрос к JSONPlaceholder API")
    print("=" * 70)
    print(f"\nURL: {api_url}")
    print(f"\nОтправляемые данные:")
    print(json.dumps(todo_data, ensure_ascii=False, indent=2))

    # Выполняем POST-запрос
    print("\nОтправка запроса...")
    response = create_todo(api_url, todo_data)

    # Выводим информацию о запросе
    print("\n" + "=" * 70)
    print("РЕЗУЛЬТАТ ЗАПРОСА")
    print("=" * 70)
    print(f"\nСтатус код: {response.status_code}")
    print(f"Заголовки запроса:")
    for key, value in response.request.headers.items():
        print(f"  {key}: {value}")

    # Выводим ответ от сервера
    print("\n" + "-" * 70)
    print("ОТВЕТ ОТ СЕРВЕРА")
    print("-" * 70)
    print(f"\nЗаголовки ответа:")
    for key, value in response.headers.items():
        print(f"  {key}: {value}")

    print(f"\nТело ответа:")
    response_data = response.json()
    print(json.dumps(response_data, ensure_ascii=False, indent=2))

    # Анализ результата
    print("\n" + "=" * 70)
    print("АНАЛИЗ")
    print("=" * 70)

    if response.status_code == 201:
        print("✓ Успешно! Статус 201 (Created) означает, что ресурс был создан")
    elif response.status_code == 200:
        print("✓ Успешно! Статус 200 (OK) означает успешное выполнение запроса")

    print(f"\nСозданный todo элемент получил ID: {response_data.get('id')}")
    print(f"Заголовок Content-Type был автоматически установлен в: application/json")

    print("\n" + "=" * 70)
    print("ВАЖНО: JSONPlaceholder - это mock API для тестирования.")
    print("Данные не сохраняются реально на сервере, но API симулирует")
    print("правильное поведение и возвращает данные так, как будто они были созданы.")
    print("=" * 70)


if __name__ == "__main__":
    main()
