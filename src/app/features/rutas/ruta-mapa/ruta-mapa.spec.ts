import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RutaMapa } from './ruta-mapa';

describe('RutaMapa', () => {
  let component: RutaMapa;
  let fixture: ComponentFixture<RutaMapa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RutaMapa],
    }).compileComponents();

    fixture = TestBed.createComponent(RutaMapa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
