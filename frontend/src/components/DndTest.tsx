import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

// Datos de ejemplo
const initialItems = [
  { id: "item-1", content: "Elemento 1" },
  { id: "item-2", content: "Elemento 2" },
  { id: "item-3", content: "Elemento 3" },
];

// Estilos básicos en línea para no depender de archivos CSS
const listStyle = {
  padding: 8,
  width: 250,
  backgroundColor: "#f0f0f0",
  border: "1px solid lightgrey",
};
const itemStyle = (isDragging: boolean, draggableStyle: any) => ({
  userSelect: "none" as const,
  padding: 16,
  margin: "0 0 8px 0",
  backgroundColor: isDragging ? "lightgreen" : "white",
  border: "1px solid lightgrey",
  ...draggableStyle,
});

export const DndTest = () => {
  const [items, setItems] = useState(initialItems);

  const onDragEnd = (result: DropResult) => {
    console.log("--- TEST Drag End ---", result); // Log para ver el resultado completo

    if (!result.destination) {
      console.log("-> TEST: Soltado fuera de la lista");
      return;
    }

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    console.log(
      "-> TEST: Nuevo orden:",
      newItems.map((i) => i.id)
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <h2>Prueba de Arrastrar y Soltar</h2>
        <p>Intenta reordenar esta lista simple:</p>
        <Droppable droppableId="simple-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={listStyle}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={itemStyle(
                        snapshot.isDragging,
                        provided.draggableProps.style
                      )}
                    >
                      {item.content}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
